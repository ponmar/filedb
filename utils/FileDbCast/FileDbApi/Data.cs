using System.Collections.Generic;

namespace FileDbApi
{
    public class Files
    {
        public List<File> files { get; set; }
    }

    public class File
    {
        public int id { get; set; }
        public string path { get; set; }
        public string description { get; set; }
        public string datetime { get; set; }
        public List<int> persons { get; set; }
        public List<int> locations { get; set; }
        public List<int> tags { get; set; }
        public string position { get; set; }
    }

    public class FileIds
    {
        public List<int> files { get; set; }
    }

    public class Person
    {
        public int id { get; set; }
        public string name { get; set; }
        public string description { get; set; }
        public string dateofbirth { get; set; }
        public int profilefileid { get; set; }
    }

    public class Persons
    {
        List<Person> persons { get; set; }
    }

    public class Location
    {
        public int id { get; set; }
        public string name { get; set; }
        public string description { get; set; }
        public string position { get; set; }
    }

    public class Locations
    {
        public List<Location> locations { get; set; }
    }

    public class Tag
    {
        public int id { get; set; }
        public string name { get; set; }
    }

    public class Tags
    {
        public List<Tag> tags { get; set; }
    }
}