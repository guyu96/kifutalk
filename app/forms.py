from flask_wtf import FlaskForm
from wtforms import ValidationError, StringField, PasswordField, SubmitField, BooleanField
from wtforms.validators import DataRequired, Email, EqualTo, Length, Regexp

from .models import User

class SignUpForm(FlaskForm):
  email = StringField('Email', validators=[
    DataRequired(),
    Length(1, 64),
    Email()
  ])
  username = StringField('Username', validators=[
    DataRequired(),
    Length(1, 64),
    Regexp(
      '^[A-Za-z0-9_.]*$', 
      0,
      'Username must contain letters, dots, and underscores only'
    )
  ])
  password = PasswordField('Password', validators=[
    DataRequired(),
    EqualTo('confirm', message='Passwords must match.')
  ])
  confirm = PasswordField('Re-enter Password', validators=[
    DataRequired()
  ])
  submit = SubmitField('Sign Up') 

  def validate_email(self, field):
    if User.query.filter_by(email=field.data).first():
      raise(ValidationError('Email already in use.'))

  def validate_username(self, field):
    if User.query.filter_by(username=field.data).first():
      raise(ValidationError('Username already in use.'))

class LoginForm(FlaskForm):
  email = StringField('Email', validators=[
    DataRequired(),
    Length(1, 64),
    Email()
  ])
  password = PasswordField('Password', validators=[
    DataRequired(),
  ])
  remember_me = BooleanField('Stay logged in')
  submit = SubmitField('Log In')
