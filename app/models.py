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
  country_id = db.Column(db.Integer, db.ForeignKey('countries.id'))
  level_id = db.Column(db.Integer, db.ForeignKey('levels.id'))

  @property
  def password(self):
    raise AttributeError('password is not readable')

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

class Role(db.Model):
  __tablename__ = 'roles'
  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(64), unique=True)

class Kifu(db.Model):
  __tablename__ = 'kifus'
  # id also used as file paths, e.g. /kifus/1.sgf for kifu with id 1
  id = db.Column(db.Integer, primary_key=True)
  title = db.Column(db.String(512))
  uploaded_on = db.Column(db.DateTime)
  owner_id = db.Column(db.Integer, db.ForeignKey('users.id'))
  # for root kifus, the two foreign keys below are the same as the primary key
  forked_from_kifu_id = db.Column(db.Integer, db.ForeignKey('kifus.id'))
  original_kifu_id = db.Column(db.Integer, db.ForeignKey('kifus.id'))
  upvotes = db.Column(db.Integer, default=0)

  @property
  def sgf(self):
    with open(os.path.join(current_app.config['SGF_FOLDER'], str(self.id) + '.sgf')) as f:
      return f.read()
  
  @property
  def serialize(self):
    uploaded_on = self.uploaded_on.strftime('%Y-%m-%d %H:%M:%S')
    return {
      'id': self.id,
      'owner': User.query.get(self.owner_id).username,
      'title': self.title,
      'uploaded_on': uploaded_on,
      'forked_from': self.forked_from_kifu_id,
      'original': self.original_kifu_id,
      'sgf': self.sgf
    }

class Comment(db.Model):
  __tablename__ = 'comments'
  id = db.Column(db.Integer, primary_key=True)
  content = db.Column(db.Text, nullable=False)
  timestamp = db.Column(db.DateTime, nullable=False)
  author = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
  in_reply_to = db.Column(db.Integer, db.ForeignKey('users.id')) # comment is reply to another user
  read = db.Column(db.Boolean, default=False) # if reply read by the in_reply_to user
  kifu_id = db.Column(db.Integer, db.ForeignKey('kifus.id'), nullable=False)
  node_id = db.Column(db.Integer, nullable=False)
  upvotes = db.Column(db.Integer, default=0)

  @property
  def serialize(self):
    return {
      'content': self.content,
      'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
      'author_id': self.author,
      'author_username': User.query.get(self.author).username,
      'in_reply_to': self.in_reply_to,
      'kifu_id': self.kifu_id,
      'node_id': self.node_id
    }

class Country(db.Model):
  __tablename__ = 'countries'
  id = db.Column(db.Integer, primary_key=True)
  name_en = db.Column(db.String(64))
  name_zh = db.Column(db.String(64))

class Level(db.Model):
  __tablename__ = 'levels'
  id = db.Column(db.Integer, primary_key=True)
  name_en = db.Column(db.String(64))
  name_zh = db.Column(db.String(64))
