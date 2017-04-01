from flask import render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required
import datetime

from . import app, db
from .models import User
from .forms import SignUpForm, LoginForm

@app.route('/')
def index():
  return(render_template('index.html'))

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

@app.route('/logout')
@login_required
def logout():
  logout_user()
  flash('You have been logged out.')
  return redirect(url_for('index'))
