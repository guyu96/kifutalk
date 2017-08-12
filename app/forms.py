from flask_wtf import FlaskForm
from wtforms import ValidationError, StringField, PasswordField, SubmitField, BooleanField, SelectField, TextAreaField
from wtforms.validators import DataRequired, Email, EqualTo, Length, Regexp, Optional, URL

from .models import User, Rank

class SignUpForm(FlaskForm):
  sign_up_email = StringField('Email', validators=[
    DataRequired(),
    Length(6, 35),
    Email()
  ])
  sign_up_username = StringField('Username', validators=[
    DataRequired(),
    Length(4, 20),
    Regexp(
      '^[A-Za-z0-9_.]*$', 
      0,
      'Username must contain letters, dots, and underscores only'
    )
  ])
  sign_up_password = PasswordField('Password', validators=[
    DataRequired(),
    Length(8, 64),
    EqualTo('sign_up_confirm', message='Passwords must match.')
  ])
  sign_up_confirm = PasswordField('Re-enter Password', validators=[
    DataRequired()
  ])
  sign_up_rank = SelectField(
    'Rank',
    choices=[(r.id, r.rank_en) for r in Rank.query.all()],
    coerce=int
  )
  sign_up_submit = SubmitField('Sign Up') 

  def validate_email(self, field):
    if User.query.filter_by(email=field.data).first():
      raise(ValidationError('Email already in use.'))

  def validate_username(self, field):
    if User.query.filter_by(username=field.data).first():
      raise(ValidationError('Username already in use.'))

class LoginForm(FlaskForm):
  login_email = StringField('Email', validators=[
    DataRequired(),
    Length(1, 64),
    Email()
  ])
  login_password = PasswordField('Password', validators=[
    DataRequired(),
  ])
  login_submit = SubmitField('Log In')
