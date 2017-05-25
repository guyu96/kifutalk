from flask import render_template, redirect, url_for, flash, request, abort, jsonify, current_app
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
def kifu(kifu_id):
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

  return render_template('kifu/kifu.html', kifu=kifu.serialize, kifu_comments=comments_dict)

@app.route('/upload', methods=['GET'])
@login_required
def upload_get():
  return render_template('upload.html')

@app.route('/upload', methods=['POST'])
@login_required
def upload_post():
  kifu_json = request.get_json()
  # insert kifu into database
  kifu = Kifu(
    title=kifu_json['title'],
    uploaded_on=datetime.datetime.now(),
    owner_id=current_user.id
  )
  print(type(kifu))
  kifu.forked_from_kifu_id = kifu.id
  kifu.original_kifu_id = kifu.id
  db.session.add(kifu)
  db.session.commit()
  # write SGF to file
  sgf_path = os.path.join(current_app.config['SGF_FOLDER'], str(kifu.id) + '.sgf')
  with open(sgf_path, 'w') as f:
    f.write(kifu_json['sgf'])

  return jsonify({
    'redirect': url_for('kifu', kifu_id=kifu.id, _external=True)
  })
