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
    name text primary key
);

create table locations (
    name text primary key
);

create table tags (
    name text primary key
);

create table filepersons(
    fileid integer,
    personname text,
    foreign key(fileid) references files(id),
    foreign key(personname) references persons(name)
);

create table filelocations(
    fileid integer,
    locationname text,
    foreign key(fileid) references files(id),
    foreign key(locationname) references locations(name)
);

create table filetags(
    fileid integer,
    tagname text,
    foreign key(fileid) references files(id),
    foreign key(tagname) references tags(name)
);
