drop table if exists filepersons;
drop table if exists filelocations;
drop table if exists filetags;
drop table if exists files;
drop table if exists persons;
drop table if exists locations;
drop table if exists tags;

create table files (
    id integer primary key autoincrement,
    path text unique not null,
    description text
);

create table persons (
    id integer primary key autoincrement,
    name text not null
);

create table locations (
    id integer primary key autoincrement,
    name text not null
);

create table tags (
    id integer primary key autoincrement,
    name text not null
);

create table filepersons(
    fileid integer references files(id) on delete cascade,
    personid integer references persons(id) on delete cascade
);

create table filelocations(
    fileid integer references files(id) on delete cascade,
    locationid integer references locations(id) on delete cascade
);

create table filetags(
    fileid integer references files(id) on delete cascade,
    tagid integer references tags(id) on delete cascade
);
