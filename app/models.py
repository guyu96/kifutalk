from flask import current_app
from flask_login import UserMixin
from itsdangerous import TimedJSONWebSignatureSerializer as Serializer

import os

from . import db, bcrypt

class User(UserMixin, db.Model):
  __tablename__ = 'users'
  id = db.Column(db.Integer, primary_key=True)
  username = db.Column(db.String(64), unique=True, index=True, nullable=False)
  email = db.Column(db.String(64), unique=True, index=True, nullable=False)
  password_hash = db.Column(db.String(128), nullable=False)
  confirmed = db.Column(db.Boolean, default=False)
  signed_up_on = db.Column(db.DateTime)
  confirmed_on = db.Column(db.DateTime)
  role_id = db.Column(db.Integer, db.ForeignKey('roles.id'))
  rank_id = db.Column(db.Integer, db.ForeignKey('ranks.id'))

  @property
  def password(self):
    raise AttributeError('password is not readable')

  @property
  def rank(self):
    return Rank.query.get(self.rank_id).rank_en;

  @password.setter
  def password(self, password):
    self.password_hash = bcrypt.generate_password_hash(password)

  def verify_password(self, password):
    return bcrypt.check_password_hash(self.password_hash, password)

  def generate_confirmation_token(self, expiration=3600):
    s = Serializer(current_app.config['SECRET_KEY'], expiration)
    return s.dump({'confirm': self.id})

  def confirm(self, token):
    s = Serializer(current_app.config['SECRET_KEY'])
    try:
      data = s.loads(token)
    except:
      return False
    if data.get('confirm') != self.id:
      return False
    self.confirmed = True
    db.session.add(self)
    db.session.commit()
    return True

  @property
  def unread_notifications(self):
    return [n.serialize for n in Notification.query.filter_by(receiver_id=self.id, read=False).order_by(Notification.id.desc()).all()]

class Role(db.Model):
  __tablename__ = 'roles'
  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(64), unique=True)

class Kifu(db.Model):
  __tablename__ = 'kifus'
  # id also used as file paths, e.g. /kifus/1.sgf for kifu with id 1
  id = db.Column(db.Integer, primary_key=True)
  uploaded_on = db.Column(db.DateTime)
  modified_on = db.Column(db.DateTime)
  owner_id = db.Column(db.Integer, db.ForeignKey('users.id'))

  # kifu info
  title = db.Column(db.String(512), nullable=False)
  description = db.Column(db.Text, default='')
  black_player = db.Column(db.String(128), default='')
  white_player = db.Column(db.String(128), default='')
  black_rank = db.Column(db.String(16), default='')
  white_rank = db.Column(db.String(16), default='')
  komi = db.Column(db.String(8), default='')
  result = db.Column(db.String(16), default='')
  
  @property
  def filepath(self):
    return os.path.join(
      current_app.config['SGF_FOLDER'],
      str(self.id) + '.sgf'
    )

  @property
  def imagepath(self):
    return os.path.join(
      current_app.config['THUMBNAIL_FOLDER'],
      str(self.id) + '.jpg'
    )

  @property
  def sgf(self):
    with open(self.filepath, 'r') as f:
      return f.read()

  @property
  def serialize(self):
    uploaded_on = self.uploaded_on.strftime('%Y-%m-%d %H:%M:%S')
    return {
      'id': self.id,
      'owner': User.query.get(self.owner_id).username,
      'title': self.title,
      'description': self.description,
      'black_player': self.black_player,
      'white_player': self.white_player,
      'black_rank': self.black_rank,
      'white_rank': self.white_rank,
      'komi': self.komi,
      'result': self.result,
      'uploaded_on': uploaded_on,
      'sgf': self.sgf
    }

  def update_sgf(self, newSGF):
    with open(self.filepath, 'w') as f:
      f.write(newSGF)

class Comment(db.Model):
  __tablename__ = 'comments'
  id = db.Column(db.Integer, primary_key=True)
  content = db.Column(db.Text, nullable=False)
  timestamp = db.Column(db.DateTime, nullable=False)
  author = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
  kifu_id = db.Column(db.Integer, db.ForeignKey('kifus.id'), nullable=False)
  node_id = db.Column(db.Integer, nullable=False)

  @property
  def serialize(self):
    return {
      'id': self.id,
      'content': self.content,
      'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
      'author_id': self.author,
      'author_username': User.query.get(self.author).username,
      'author_rank': User.query.get(self.author).rank,
      'kifu_id': self.kifu_id,
      'node_id': self.node_id
    }

class KifuStar(db.Model):
  __tablename__='kifustars'
  id = db.Column(db.Integer, primary_key=True)
  user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
  kifu_id = db.Column(db.Integer, db.ForeignKey('kifus.id'), nullable=False)

class Rank(db.Model):
  __tablename__ = 'ranks'
  id = db.Column(db.Integer, primary_key=True)
  rank_en = db.Column(db.String(16))
  rank_cn = db.Column(db.String(16))

class Notification(db.Model):
  __tablename__ = 'notifications'
  id = db.Column(db.Integer, primary_key=True)
  # category == 1: kifu that user uploaded received a new comment
  # category == 2: a node that user commented on received another comment
  category = db.Column(db.Integer, nullable=False)
  # user receiving the notification
  receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
  # comment that triggered the notification
  # from the comment, kifu_id, node_id, and commenter_id will be known
  comment_id = db.Column(db.Integer, db.ForeignKey('comments.id'), nullable=False)
  # whether notification has already been read
  read = db.Column(db.Boolean, default=False)

  @property
  def serialize(self):
    comment = Comment.query.get(self.comment_id)
    kifu = Kifu.query.get(comment.kifu_id)
    return {
      'id': self.id,
      'category': self.category,
      'read': self.read,
      'comment_id': self.comment_id,
      'content': comment.content,
      'timestamp': comment.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
      'kifu_id': kifu.id,
      'kifu_title': kifu.title,
      'node_id': comment.node_id,
      'author_username': User.query.get(comment.author).username,
      'author_rank': User.query.get(comment.author).rank
    }
