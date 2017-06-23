from flask import render_template, redirect, url_for, flash, request, abort, jsonify, current_app, send_file
from flask_login import login_user, logout_user, login_required, current_user
import datetime, os

from . import app, db
from .models import User, Kifu, Comment
from .forms import SignUpForm, LoginForm

# home page
@app.route('/')
def index():
  return(render_template('index.html'))

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

  return render_template(
    'kifu/kifu.html',
    kifu=kifu.serialize,
    kifu_comments=comments_dict,
    auth_status=auth_status
  )

@app.route('/kifu/<int:kifu_id>', methods=['UPDATE'])
@login_required
def kifu_update(kifu_id):
  kifu = Kifu.query.filter_by(id=kifu_id).first_or_404()
  if (kifu.owner_id != current_user.id):
    abort(401)

  data = request.get_json()
  kifu.modified_on = datetime.datetime.now()

  # update SGF
  if 'sgf' in data and 'deletedNodes' in data:
    kifu.update_sgf(data['sgf'])
    # delete comments on deleted nodes
    for node_id in data['deletedNodes']:
      comments = Comment.query.filter_by(node_id=node_id).all()
      for c in comments:
        db.session.delete(c)

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

@app.route('/kifu/<int:kifu_id>', methods=['DELETE'])
def kifu_delete(kifu_id):
  kifu = Kifu.query.filter_by(id=kifu_id).first_or_404()
  if (kifu.owner_id != current_user.id):
    abort(401)

  # delete all comments posted on this kifu
  kifu_comments = Comment.query.filter_by(kifu_id=kifu_id).all()
  for kc in kifu_comments:
    db.session.delete(kc)

  # set child kifu's original/fork_from pointer to null
  originial = Kifu.query.filter_by(original_kifu_id=kifu_id)
  fork = Kifu.query.filter_by(forked_from_kifu_id=kifu_id)
  for o in originial:
    o.original_kifu_id = None
    db.session.add(o)
  for f in fork:
    f.forked_from_kifu_id = None
    db.session.add(f)

  # delete and commit
  db.session.delete(kifu)
  db.session.commit()

  # remove local file
  os.remove(kifu.filepath)

  return jsonify({
    'redirect': url_for('index', _external=True)
  })

@app.route('/upload', methods=['GET'])
def upload_get():
  if current_user.is_authenticated:
    return render_template('upload.html')
  flash('You must log in first to upload kifus')
  return redirect(url_for('login'))

@app.route('/upload', methods=['POST'])
@login_required
def upload_post():
  kifu_json = request.get_json()
  print(kifu_json )

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

  return jsonify({
    'redirect': url_for('kifu_get', kifu_id=kifu.id, _external=True)
  })

# create a new, empty kifu
@app.route('/new', methods=['GET'])
def new():
  # must be logged in
  if not current_user.is_authenticated:
    flash('You must log in to create a new kifu')
    return redirect(url_for('login'))

  # add new kifu to database
  kifu = Kifu(
    title='New Kifu',
    uploaded_on=datetime.datetime.now(),
    owner_id=current_user.id
  )
  db.session.add(kifu)
  db.session.commit()

  # write SGF to file
  with open(kifu.filepath, 'w') as f:
    f.write('()')

  return redirect(url_for('kifu_get', kifu_id=kifu.id))

# fork an existing kifu
@app.route('/fork/<int:kifu_id>', methods=['POST'])
@login_required
def fork(kifu_id):
  kifu = Kifu.query.filter_by(id=kifu_id).first_or_404()

  # owner is not allowed to fork his/her own kifu
  if kifu.owner_id == current_user.id:
    abort(401)

  # create a clone of kifu
  original_id = kifu.original_kifu_id if kifu.original_kifu_id else kifu.id
  kifu_clone = Kifu(
    title=kifu.title,
    uploaded_on=datetime.datetime.now(),
    owner_id=current_user.id,
    original_kifu_id = original_id,
    forked_from_kifu_id = kifu.id
  )

  # add kifu to database
  db.session.add(kifu_clone)
  db.session.commit()

  # write SGF to file
  with open(kifu_clone.filepath, 'w') as clone_file:
    with open(kifu.filepath, 'r') as original_file:
      clone_file.write(original_file.read())

  return jsonify({
    'redirect': url_for('kifu_get', kifu_id=kifu_clone.id, _external=True)
  })

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

  return render_template(
    'user-kifulist.html',
    user_id=user.id,
    username=user.username,
    kifus=user_kifu.items,
    page_num=user_kifu.page,
    has_next=user_kifu.has_next,
    has_prev=user_kifu.has_prev
  )
