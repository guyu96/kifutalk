from app import db
from app.models import Rank

SQL_CMD = 'CREATE DATABASE kifutalk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'

# initialize database
db.create_all()

# populate ranks table
for i in range(18):
  r = Rank(rank_en='%dk'%(18-i), rank_cn='%d级'%(18-i))
  db.session.add(r)
for i in range(9):
  r = Rank(rank_en='%dd'%(i+1), rank_cn='%d段'%(i+1))
  db.session.add(r)
for i in range(9):
  r = Rank(rank_en='%dp'%(i+1), rank_cn='职业%d段'%(i+1))
  db.session.add(r)
db.session.commit()
