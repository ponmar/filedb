using Newtonsoft.Json;
using System;
using System.Collections.Generic;

/// <summary>
/// This namespace contains helper classes for handling serialization and deserialization of FileDB JSON formatted data
/// </summary>
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
        
        /// <summary>
        /// Null when no data available
        /// </summary>
        public string description { get; set; }

        /// <summary>
        /// Null when no data available
        /// </summary>
        public string datetime { get; set; }

        public List<int> persons { get; set; }
        
        public List<int> locations { get; set; }
        
        public List<int> tags { get; set; }

        /// <summary>
        /// Null when no data available
        /// </summary>
        public string position { get; set; }

        /// <summary>
        /// Null when no data available
        /// </summary>
        [JsonIgnore]
        public TimeSpan? Age
        {
            get
            {
                if (datetime == null || !DateTime.TryParse(datetime, out DateTime dateTime))
                {
                    return null;
                }
                return DateTime.Now - dateTime;
            }
        }
    }

    public class FileIds
    {
        public List<int> files { get; set; }
    }

    public class Person
    {
        public int id { get; set; }
        
        public string firstname { get; set; }
        
        public string lastname { get; set; }

        /// <summary>
        /// Null when no data available
        /// </summary>
        public string description { get; set; }

        /// <summary>
        /// Null when no data available
        /// </summary>
        public string dateofbirth { get; set; }

        /// <summary>
        /// Null when no data available
        /// </summary>
        public int? profilefileid { get; set; }

        [JsonIgnore]
        public string Name
        {
            get { return firstname + " " + lastname; }
        }

        [JsonIgnore]
        public TimeSpan Age
        {
            get
            {
                if (dateofbirth == null || !DateTime.TryParse(dateofbirth, out DateTime dateOfBirth))
                {
                    return TimeSpan.Zero;
                }
                return DateTime.Now - dateOfBirth;
            }
        }
    }

    public class Persons
    {
        List<Person> persons { get; set; }
    }

    public class Location
    {
        public int id { get; set; }

        public string name { get; set; }

        /// <summary>
        /// Null when no data available
        /// </summary>
        public string description { get; set; }

        /// <summary>
        /// Null when no data available
        /// </summary>
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

    public class Directories
    {
        public List<string> directories { get; set; }
    }

    public class ServerStats
    {
        public int num_files { get; set; }

        public int num_persons { get; set; }

        public int num_locations { get; set; }

        public int num_tags { get; set; }
    }
}
