drop table if exists files;
create table files (
  id integer primary key autoincrement,
  path text not null,
  description text
);
