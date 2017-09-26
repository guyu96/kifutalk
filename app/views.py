from flask import render_template, redirect, url_for, flash, request, abort, jsonify, current_app, send_file
from flask_login import login_user, logout_user, login_required, current_user
from sqlalchemy.sql import func
import datetime, os, base64, urllib.request
from PIL import Image

from . import app, db
from .models import User, Kifu, Comment, KifuStar, Notification
from .forms import SignUpForm, LoginForm
from .sgf import validate_sgf, validate_sub_sgf, get_sgf_info, standardize_sgf


# helper functions to save and retrieve kifu thumbnails
def save_thumbnail(kifu, base64_str):
  # first write image to temperory file
  temp_img = current_app.config['SGF_FOLDER'] + '/.temp' + str(kifu.id)
  with open(temp_img, 'wb') as f:
    f.write(base64.decodebytes(bytes(base64_str, 'utf-8')))
  # write scaled image
  img = Image.open(temp_img)
  img.thumbnail(current_app.config['THUMBNAIL_SIZE'])
  img.save(kifu.imagepath, 'JPEG')
  # remove temporary file
  os.remove(temp_img)

def thumbnail_dataurl(kifu):
  with open(kifu.imagepath, 'r') as f:
    # append dataurl prefix
    return 'data:image/jpeg;base64,' + f.read()

# home page
@app.route('/', methods=['GET', 'POST'])
def index():
  login_form = LoginForm()
  sign_up_form = SignUpForm()

  if login_form.login_submit.data and login_form.validate_on_submit():
    user = User.query.filter_by(email=login_form.login_email.data).first()
    if user is not None and user.verify_password(login_form.login_password.data):
      login_user(user, True)
      return redirect(request.args.get('next') or url_for('index'))
    flash('Invalid email address or password.')

  if sign_up_form.sign_up_submit.data and sign_up_form.validate_on_submit():
    user = User(
      email=sign_up_form.sign_up_email.data,
      username=sign_up_form.sign_up_username.data,
      password=sign_up_form.sign_up_password.data,
      rank_id=sign_up_form.sign_up_rank.data,
      signed_up_on=datetime.datetime.now()
    )
    db.session.add(user)
    db.session.commit()
    flash('You can now log in.')
    return redirect(url_for('index'))


  return render_template('index.html', login_form=login_form, sign_up_form=sign_up_form)

# log out
@app.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
  logout_user()
  flash('You have been logged out.')
  return redirect(url_for('index'))

# post comments
@app.route('/comment/<int:kifu_id>/<int:node_id>', methods=['POST'])
@login_required
def post_comment(kifu_id, node_id):
  # check if kifu exists
  kifu = Kifu.query.filter_by(id=kifu_id).first_or_404()

  # add comment to database
  comment = Comment(
    content=request.get_json(),
    timestamp=datetime.datetime.now(),
    author=current_user.id,
    kifu_id=kifu_id,
    node_id=node_id
  )
  db.session.add(comment)
  db.session.commit()

  # add notifications to database
  # first, if the comment is not made by kifu_owner, then
  # kifu_owner gets a category-1 notification
  if current_user.id != kifu.owner_id:
    db.session.add(Notification(
      category=1,
      receiver_id=kifu.owner_id,
      comment_id=comment.id
    ))
  # second, other users who have commented on the same node
  # gets a category-2 notification (excluding the user who
  # submitted this comment and kifu_owner)
  other_comments = Comment.query.filter_by(
    kifu_id=kifu_id,
    node_id=node_id
  ).all()
  # generate a filtered list of users who should receive a notification
  filtered_authors = []
  for oc in other_comments:
    duplicate = False
    for fa in filtered_authors:
      if oc.author == fa:
        duplicate = True
    # filter out duplicate users who commented
    if not duplicate:
      # filter out kifu_owner and notification-triggerer
      if oc.author != kifu.owner_id and oc.author != current_user.id:
        filtered_authors.append(oc.author)
  for fa in filtered_authors:
    db.session.add(Notification(
      category=2,
      receiver_id=fa,
      comment_id=comment.id
    ))
  db.session.commit()

  return jsonify(comment.serialize)

# kifu main page
@app.route('/kifu/<int:kifu_id>', methods=['GET'])
def kifu_get(kifu_id):
  # get query strings
  query_node_id = request.args.get('node_id')
  query_edit = request.args.get('edit')
  # comment_id should be of a comment on the node with id node_id
  query_comment_id = request.args.get('comment_id')

  # get kifu
  kifu = Kifu.query.filter_by(id=kifu_id).first_or_404()

  # get and process comments for kifu
  comments = Comment.query.filter_by(kifu_id=kifu_id).all()
  comments_dict = {}

  # arrange comments by node_id
  for c in comments:
    if c.node_id not in comments_dict:
      comments_dict[c.node_id] = [c]
    else:
      comments_dict[c.node_id].append(c)

  # sort comments by timestamp for each node_id
  for node_id in comments_dict:
    comments_dict[node_id].sort(key=lambda c: c.timestamp)
    # serialize comments
    comments_dict[node_id] = [c.serialize for c in comments_dict[node_id]]

  # authentication status
  # 0: not logged in
  # 1: logged in but not owner of kifu
  # 2: logged in and is owner of kifu
  if not current_user.is_authenticated:
    auth_status = 0
  elif current_user.id != kifu.owner_id:
    auth_status = 1
  else:
    auth_status = 2

  # check if kifu starred by user
  if not current_user.is_authenticated:
    starred = False
  else:
    kifustar = KifuStar.query.filter_by(
      user_id=current_user.id,
      kifu_id=kifu_id
    ).first()
    starred = False if kifustar is None else True

  return render_template(
    'kifu/kifu.html',
    kifu=kifu.serialize,
    kifu_comments=comments_dict,
    auth_status=auth_status,
    starred=starred,
    node_id=query_node_id,
    edit=query_edit,
    comment_id=query_comment_id,
    url=url_for('kifu_get', kifu_id=kifu_id, _external=True)
  )

# update kifu
@app.route('/kifu/<int:kifu_id>', methods=['UPDATE'])
@login_required
def kifu_update(kifu_id):
  kifu = Kifu.query.filter_by(id=kifu_id).first_or_404()

  data = request.get_json()
  kifu.modified_on = datetime.datetime.now()

  # update SGF
  if 'sgf' in data: # deletedNodes and img should also be present
    # first ensure that new SGF contains all nodes present in the old SGF
    if not validate_sub_sgf(data['sgf'], kifu.sgf):
      abort(401)
    # update SGF
    kifu.update_sgf(data['sgf'])

    ### disable comment deletion because as of now, nobody is allowed
    ### to delete existing nodes in a kifu
    ### deleting comments based on data['deletedNodes'] alone without
    ### server-side validation is also unsafe

    # # delete comments on deleted nodes
    # for node_id in data['deletedNodes']:
    #   comments = Comment.query.filter_by(node_id=node_id).all()
    #   for c in comments:
    #     db.session.delete(c)

    # update kifu thumbnail
    save_thumbnail(kifu, data['img'])
  
  # update other data (must be kifu owner)
  if current_user.id == kifu.owner_id:
    if 'blackPlayer' in data:
      kifu.black_player = data['blackPlayer']
    if 'whitePlayer' in data:
      kifu.white_player = data['whitePlayer']
    if 'blackRank' in data:
      kifu.black_rank = data['blackRank']
    if 'whiteRank' in data:
      kifu.white_rank = data['whiteRank']
    if 'komi' in data:
      kifu.komi = data['komi']
    if 'result' in data:
      kifu.result = data['result']
    if 'description' in data:
      kifu.description = data['description']
    if 'title' in data:
      kifu.title = data['title']

  db.session.add(kifu)
  db.session.commit()
  return jsonify(kifu.serialize)

# delete kifu
@app.route('/kifu/<int:kifu_id>', methods=['DELETE'])
@login_required
def kifu_delete(kifu_id):
  kifu = Kifu.query.filter_by(id=kifu_id).first_or_404()
  if (kifu.owner_id != current_user.id):
    abort(401)

  # delete all notifications triggered by comments on this kifu
  kifu_comments = Comment.query.filter_by(kifu_id=kifu_id).all()
  for kc in kifu_comments:
    kifu_notifications = Notification.query.filter_by(comment_id=kc.id).all()
    for kn in kifu_notifications:
      db.session.delete(kn)
  db.session.commit()

  # delete all comments posted on this kifu
  for kc in kifu_comments:
    db.session.delete(kc)
  db.session.commit()

  # delete all kifustars entries of this kifu
  stars = KifuStar.query.filter_by(kifu_id=kifu_id)
  for s in stars:
    db.session.delete(s)
  db.session.commit()

  # delete kifu and commit
  db.session.delete(kifu)
  db.session.commit()

  # remove local file
  os.remove(kifu.filepath)
  os.remove(kifu.imagepath)

  return jsonify({
    'redirect': url_for('index', _external=True)
  })

# upload page
@app.route('/upload', methods=['GET', 'POST'])
def upload():
  if request.method == 'GET':
    if not current_user.is_authenticated:
      flash('You must log in first to upload kifus')
      return redirect(url_for('index'))
    return render_template('upload.html')

  # request.method == 'POST'
  # validate SGF and get SGF info
  kifu_json = request.get_json()
  print(kifu_json)
  if not validate_sgf(kifu_json['sgf']):
    abort(400)
  info = get_sgf_info(kifu_json['sgf'])
  sgf_str = standardize_sgf(kifu_json['sgf'])

  # insert kifu into database
  kifu = Kifu(
    title=kifu_json['title'],
    description=kifu_json['description'],
    black_player=info['PB'],
    white_player=info['PW'],
    black_rank=info['BR'],
    white_rank=info['WR'],
    komi=info['KM'],
    result=info['RE'],
    uploaded_on=datetime.datetime.now(),
    owner_id=current_user.id
  )
  db.session.add(kifu)
  db.session.commit()

  # write SGF to file
  with open(kifu.filepath, 'w') as f:
    f.write(sgf_str)

  # save kifu thumbnail
  save_thumbnail(kifu, kifu_json['img'])

  return jsonify({
    'redirect': url_for('kifu_get', kifu_id=kifu.id, _external=True)
  })

@app.route('/get-external-sgf', methods=['POST'])
def get_external_sgf():
  url = request.get_json()['url']
  # catch network/invalid url errors
  try:
    response = urllib.request.urlopen(url, timeout=current_app.config['URL_TIMEOUT'])
  except Exception as e:
    abort(404)
  # catch invalid text file errors
  try:
    return jsonify({'sgf': response.read().decode('utf-8')})
  except Exception as e:
    abort(400)

# create a new, empty kifu
@app.route('/new', methods=['GET'])
def new():
  # must be logged in
  if not current_user.is_authenticated:
    flash('You must log in to create a new kifu')
    return redirect(url_for('index'))

  # insert kifu into database
  kifu = Kifu(
    title='',
    uploaded_on=datetime.datetime.now(),
    owner_id=current_user.id
  )
  db.session.add(kifu)
  db.session.commit()

  # write empty SGF to file
  with open(kifu.filepath, 'w') as f:
    f.write(standardize_sgf('()'))

  # save kifu thumbnail
  with open(current_app.config['EMPTY_BOARD_DATAURL'], 'r') as f:
    save_thumbnail(kifu, f.read())

  return redirect(url_for('kifu_get', kifu_id=kifu.id, edit=True))

# star a kifu
@app.route('/star/kifu/<int:kifu_id>', methods=['POST'])
@login_required
def star_kifu(kifu_id):
  # check if kifu exists
  kifu = Kifu.query.filter_by(id=kifu_id).first_or_404()
  # check if user has already starred this kifu
  starred = KifuStar.query.filter_by(
    user_id=current_user.id,
    kifu_id=kifu_id
  ).first()
  if starred is not None:
    abort(400)

  # star kifu
  kifustar = KifuStar(
    user_id=current_user.id,
    kifu_id=kifu_id
  )
  db.session.add(kifustar)
  db.session.commit()

  return jsonify({'success': True})

# unstar a kifu
@app.route('/unstar/kifu/<int:kifu_id>', methods=['POST'])
@login_required
def unstar_kifu(kifu_id):
  # check if kifu exists
  kifu = Kifu.query.filter_by(id=kifu_id).first_or_404()
  # check if user has already starred this kifu
  starred = KifuStar.query.filter_by(
    user_id=current_user.id,
    kifu_id=kifu_id
  ).first()
  if starred is None:
    abort(400)

  # unstar kifu
  db.session.delete(starred)
  db.session.commit()

  return jsonify({'success': True})

# download a kifu
@app.route('/download/<int:kifu_id>', methods=['GET'])
def download(kifu_id):
  kifu = Kifu.query.filter_by(id=kifu_id).first_or_404()
  return send_file(
    kifu.filepath,
    mimetype='text/sgf',
    attachment_filename=str(kifu.id)+'.sgf',
    as_attachment=True
  )

# helper function that generates a kifu pagination
# based on constraints of its arguments
def get_kifu_pagination(page, sort_by, time_frame, display_in, uploaded_by=None, saved_by=None):
  # kifus uploaded after earliest_time will be included
  current_time = datetime.datetime.now()
  if time_frame == 'day':
    earliest_time = current_time - datetime.timedelta(days=1)
  elif time_frame == 'week':
    earliest_time = current_time - datetime.timedelta(days=7)
  elif time_frame == 'month':
    earliest_time = current_time - datetime.timedelta(days=30)
  elif time_frame == 'year':
    earliest_time = current_time - datetime.timedelta(days=365)
  else:
    earliest_time = None

  # subquery to count number of comments each kifu has
  count_query = db.session.query(Comment.kifu_id, func.count('*').label('comment_count')).group_by(Comment.kifu_id).subquery()

  # query to get all the kifu info
  kifu_query = db.session.query(Kifu, User, count_query.c.comment_count).join(User).outerjoin(count_query, Kifu.id==count_query.c.kifu_id)

  # filter query if uploaded_by or save_by is specified
  if uploaded_by is not None:
    kifu_query = kifu_query.filter(Kifu.owner_id == uploaded_by)
  elif saved_by is not None:
    saved_kifu_ids = [sk_id[0] for sk_id in db.session.query(KifuStar.kifu_id).filter(KifuStar.user_id==saved_by).distinct()]
    # print(saved_kifu_ids)
    kifu_query = kifu_query.filter(Kifu.id.in_(saved_kifu_ids))

  # filter query by upload date
  if earliest_time is not None:
    kifu_query = kifu_query.filter(Kifu.uploaded_on >= earliest_time)

  # order query based on query strings
  if sort_by == 'date':
    if display_in == 'desc':
      sorted_query = kifu_query.order_by(Kifu.uploaded_on.desc())
    else:
      sorted_query = kifu_query.order_by(Kifu.uploaded_on.asc())
  else:
    if display_in == 'desc':
      sorted_query = kifu_query.order_by(count_query.c.comment_count.desc())
    else:
      sorted_query = kifu_query.order_by(count_query.c.comment_count.asc())

  # paginate
  sorted_pagination = sorted_query.paginate(
    page=page,
    per_page=current_app.config['PERPAGE'],
    error_out=True
  )
  return sorted_pagination

# browse kifu
@app.route('/browse', methods=['GET'])
@app.route('/browse/user-upload/<int:upload_user_id>', methods=['GET'])
@app.route('/browse/user-save/<int:save_user_id>', methods=['GET'])
def browse_kifu(upload_user_id=None, save_user_id=None):
  # get query strings
  page = int(request.args.get('page')) if request.args.get('page') else 1
  sort_by = request.args.get('sort-by') if request.args.get('sort-by') else 'date'
  time_frame = request.args.get('time-frame') if request.args.get('time-frame') else 'all-time'
  display_in = request.args.get('display-in') if request.args.get('display-in') else 'desc'

  if upload_user_id is not None:
    user = User.query.filter_by(id=upload_user_id).first_or_404()
    kifu_pagination = get_kifu_pagination(page, sort_by, time_frame, display_in, uploaded_by=upload_user_id)
    base_url = '/browse/user-upload/' + str(upload_user_id)
    browse_title = 'Uploads by %s (%s)' % (user.username, user.rank)
  elif save_user_id is not None:
    user = User.query.filter_by(id=save_user_id).first_or_404()
    kifu_pagination = get_kifu_pagination(page, sort_by, time_frame, display_in, saved_by=save_user_id)
    base_url = '/browse/user-save/' + str(save_user_id)
    browse_title = 'Kifus saved by %s (%s)' % (user.username, user.rank)
  else:
    kifu_pagination = get_kifu_pagination(page, sort_by, time_frame, display_in)
    base_url = '/browse'
    browse_title = 'All uploads on Kifutalk'

  return render_template(
    'browse.html',
    base_url=base_url,
    browse_title=browse_title,
    items=kifu_pagination.items,
    page_num=kifu_pagination.page,
    has_next=kifu_pagination.has_next,
    has_prev=kifu_pagination.has_prev,
    query_string_list=[sort_by, time_frame, display_in]
  )

# mark a notification as read
@app.route('/read-notification/<int:notification_id>', methods=['POST'])
def read_notification(notification_id):
  notification = Notification.query.filter_by(id=notification_id).first_or_404()
  notification.read = True
  db.session.add(notification)
  db.session.commit()
  return jsonify({'success': True})
