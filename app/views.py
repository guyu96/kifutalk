from flask import render_template, redirect, url_for, flash, request, abort, jsonify, current_app, send_file
from flask_login import login_user, logout_user, login_required, current_user
import datetime, os, base64
from PIL import Image

from . import app, db
from .models import User, Kifu, Comment, KifuStar
from .forms import SignUpForm, LoginForm
from .sgf import validate_sgf, validate_sub_sgf

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

# home page (also browse kifu)
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

# sign up page
@app.route('/signup', methods=['GET', 'POST'])
def signup():
  form = SignUpForm()
  if form.validate_on_submit():
    user = User(
      email=form.email.data,
      username=form.username.data,
      password=form.password.data,
      signed_up_on=datetime.datetime.now()
    )
    db.session.add(user)
    db.session.commit()
    flash('You can now log in.')
    return redirect(url_for('login'))
  return render_template('signup.html', form=form)

# log in page
@app.route('/login', methods=['GET', 'POST'])
def login():
  form = LoginForm()
  if form.validate_on_submit():
    user = User.query.filter_by(email=form.email.data).first()
    if user is not None and user.verify_password(form.password.data):
      login_user(user, form.remember_me.data)
      return redirect(request.args.get('next') or url_for('index'))
    flash('Invalid email address or password.')
  return render_template('login.html', form=form)

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
  comment = Comment(
    content=request.get_json(),
    timestamp=datetime.datetime.now(),
    author=current_user.id,
    kifu_id=kifu_id,
    node_id=node_id
  )
  db.session.add(comment)
  db.session.commit()
  return jsonify(comment.serialize)

# kifu main page
@app.route('/kifu/<int:kifu_id>', methods=['GET'])
def kifu_get(kifu_id):
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
    starred=starred
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
    # delete comments on deleted nodes
    for node_id in data['deletedNodes']:
      comments = Comment.query.filter_by(node_id=node_id).all()
      for c in comments:
        db.session.delete(c)
    # update kifu thumbnail
    save_thumbnail(kifu, data['img'])
  
  # update other data
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

  # delete all comments posted on this kifu
  kifu_comments = Comment.query.filter_by(kifu_id=kifu_id).all()
  for kc in kifu_comments:
    db.session.delete(kc)

  # delete all kifustars entries of this kifu
  stars = KifuStar.query.filter_by(kifu_id=kifu_id)
  for s in stars:
    db.session.delete(s)

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
@app.route('/upload', methods=['GET'])
def upload_get():
  if current_user.is_authenticated:
    return render_template('upload.html')
  flash('You must log in first to upload kifus')
  return redirect(url_for('login'))

# upload kifu
@app.route('/upload', methods=['POST'])
@login_required
def upload_post():
  kifu_json = request.get_json()

  # insert kifu into database
  kifu = Kifu(
    black_player=kifu_json['blackPlayer'],
    white_player=kifu_json['whitePlayer'],
    black_rank=kifu_json['blackRank'],
    white_rank=kifu_json['whiteRank'],
    komi=kifu_json['komi'],
    result=kifu_json['result'],
    uploaded_on=datetime.datetime.now(),
    owner_id=current_user.id
  )
  db.session.add(kifu)
  db.session.commit()

  # write SGF to file
  with open(kifu.filepath, 'w') as f:
    f.write(kifu_json['sgf'])

  # save kifu thumbnail
  save_thumbnail(kifu, kifu_json['img'])

  return jsonify({
    'redirect': url_for('kifu_get', kifu_id=kifu.id, _external=True)
  })

# create a new, empty kifu
@app.route('/new', methods=['POST'])
def new():
  # must be logged in
  if not current_user.is_authenticated:
    flash('You must log in to create a new kifu')
    return jsonify({'redirect': url_for('login')})

  kifu_json = request.get_json()

  # insert kifu into database
  kifu = Kifu(
    uploaded_on=datetime.datetime.now(),
    owner_id=current_user.id
  )
  db.session.add(kifu)
  db.session.commit()

  # write empty SGF to file
  with open(kifu.filepath, 'w') as f:
    f.write('()')

  # save kifu thumbnail
  save_thumbnail(kifu, kifu_json['img'])

  return jsonify({
    'redirect': url_for('kifu_get', kifu_id=kifu.id, _external=True)
  })

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
  ).first();
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
  ).first();
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

# browse kifu
@app.route('/browse', methods=['GET'])
@app.route('/browse/<int:page>', methods=['GET'])
def browse_kifu(page=1):
  kifu_pagination = Kifu.query.join(User).add_columns(
    User.username, Kifu.id, Kifu.black_player, Kifu.white_player, Kifu.black_rank, Kifu.white_rank, Kifu.uploaded_on
  ).order_by(Kifu.uploaded_on.desc()).paginate(
    page=page,
    per_page=current_app.config['PERPAGE'],
    error_out=True
  )
  return render_template(
    'kifulist.html',
    kifus=kifu_pagination.items,
    page_num=kifu_pagination.page,
    has_next=kifu_pagination.has_next,
    has_prev=kifu_pagination.has_prev
  )

# user profile page
@app.route('/user/<int:user_id>', methods=['GET'])
@app.route('/user/<int:user_id>/<int:page>', methods=['GET'])
def profile(user_id, page=1):
  user = User.query.filter_by(id=user_id).first_or_404()
  user_kifu = Kifu.query.filter_by(owner_id=user_id).join(User).add_columns(
    User.username, Kifu.id, Kifu.black_player, Kifu.white_player, Kifu.black_rank, Kifu.white_rank, Kifu.uploaded_on
  ).order_by(Kifu.uploaded_on.desc()).paginate(
    page=page,
    per_page=current_app.config['PERPAGE'],
    error_out=True
  )
  print(user.username)
  return render_template(
    'user-kifulist.html',
    user_id=user.id,
    username=user.username,
    kifus=user_kifu.items,
    page_num=user_kifu.page,
    has_next=user_kifu.has_next,
    has_prev=user_kifu.has_prev
  )
