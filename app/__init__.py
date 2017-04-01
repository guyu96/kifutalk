from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager

app = Flask(__name__, instance_relative_config=True)
app.config.from_object('config')
app.config.from_pyfile('config.py')

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager()
login_manager.init_app(app)
# login_manager.login_view = 'signup'

from . import models, forms, views

@login_manager.user_loader
def load_user(userid):
  return models.User.query.get(int(userid))

if __name__ == "__main__":
  app.run()
