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
    fileid integer,
    personid integer,
    foreign key(fileid) references files(id),
    foreign key(personid) references persons(id)
);

create table filelocations(
    fileid integer,
    locationid integer,
    foreign key(fileid) references files(id),
    foreign key(locationid) references locations(id)
);

create table filetags(
    fileid integer,
    tagid integer,
    foreign key(fileid) references files(id),
    foreign key(tagid) references tags(id)
);
