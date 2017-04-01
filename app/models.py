from flask import current_app
from flask_login import UserMixin
from itsdangerous import TimedJSONWebSignatureSerializer as Serializer

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
  id = db.Column(db.Integer, primary_key=True)
  sgf_string = db.Column(db.Text)
  title = db.Column(db.String(256))
  uploaded_on = db.Column(db.DateTime)
  owner_id = db.Column(db.Integer, db.ForeignKey('users.id'))
  forked_from_kifu_id = db.Column(db.Integer, db.ForeignKey('kifus.id'))
  original_kifu_id = db.Column(db.Integer, db.ForeignKey('kifus.id'))

class Comment(db.Model):
  __tablename__ = 'comments'
  id = db.Column(db.Integer, primary_key=True)
  content = db.Column(db.Text)
  timestamp = db.Column(db.DateTime)
  posted_by = db.Column(db.Integer, db.ForeignKey('users.id'))
  in_reply_to = db.Column(db.Integer, db.ForeignKey('users.id'))
  kifu_id = db.Column(db.Integer, db.ForeignKey('kifus.id'))

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
