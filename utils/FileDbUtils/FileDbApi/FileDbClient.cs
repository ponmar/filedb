using Newtonsoft.Json;
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

namespace FileDbApi
{
    /// <summary>
    /// This is a client implementation for the FileDB HTTP REST API
    /// </summary>
    public class FileDbClient
    {
        private readonly string filedbUrl;
        private readonly HttpClient httpClient = new HttpClient();

        public FileDbClient(string hostname, int port) : this("http://" + hostname + ":" + port)
        {
        }

        public FileDbClient(string filedbUrl)
        {
            this.filedbUrl = filedbUrl;
            httpClient.BaseAddress = new Uri(filedbUrl);
            httpClient.DefaultRequestHeaders.Accept.Clear();
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }

        public string GetFileContentUrl(int fileId, bool reorient = false)
        {
            if (reorient)
            {
                return filedbUrl + "/api/filecontent_reoriented/" + fileId;
            }
            else
            {
                return filedbUrl + "/api/filecontent/" + fileId;
            }
        }

        public string GetThumbnailUrl(int fileId)
        {
            return filedbUrl + "/api/thumbnail/" + fileId;
        }

        public string GetThumbnailUrl(int fileId, int width, int height)
        {
            return filedbUrl + "/api/thumbnail/" + fileId + "?width=" + width + "&height=" + height;
        }

        public async Task<Persons> GetPersonsAsync()
        {
            Persons persons = null;
            HttpResponseMessage response = await httpClient.GetAsync("/api/persons");
            if (response.IsSuccessStatusCode)
            {
                persons = await response.Content.ReadAsAsync<Persons>();
            }
            return persons;
        }

        public async Task<Person> GetPersonAsync(int personId)
        {
            Person person = null;
            HttpResponseMessage response = await httpClient.GetAsync("/api/person/" + personId);
            if (response.IsSuccessStatusCode)
            {
                person = await response.Content.ReadAsAsync<Person>();
            }
            return person;
        }

        public async Task<Locations> GetLocationsAsync()
        {
            Locations locations = null;
            HttpResponseMessage response = await httpClient.GetAsync("/api/locations");
            if (response.IsSuccessStatusCode)
            {
                locations = await response.Content.ReadAsAsync<Locations>();
            }
            return locations;
        }

        public async Task<Location> GetLocationAsync(int locationId)
        {
            Location location = null;
            HttpResponseMessage response = await httpClient.GetAsync("/api/location/" + locationId);
            if (response.IsSuccessStatusCode)
            {
                location = await response.Content.ReadAsAsync<Location>();
            }
            return location;
        }

        public async Task<Tags> GetTagsAsync()
        {
            Tags tags = null;
            HttpResponseMessage response = await httpClient.GetAsync("/api/tags");
            if (response.IsSuccessStatusCode)
            {
                tags = await response.Content.ReadAsAsync<Tags>();
            }
            return tags;
        }

        public async Task<Tag> GetTagAsync(int tagId)
        {
            Tag tag = null;
            HttpResponseMessage response = await httpClient.GetAsync("/api/tag/" + tagId);
            if (response.IsSuccessStatusCode)
            {
                tag = await response.Content.ReadAsAsync<Tag>();
            }
            return tag;
        }

        public async Task<Files> GetFilesAsync(FileIds fileIds)
        {
            Files files = null;
            var content = new StringContent(JsonConvert.SerializeObject(fileIds), Encoding.UTF8, "application/json");
            HttpResponseMessage response = await httpClient.PostAsync("/api/files", content);
            if (response.IsSuccessStatusCode)
            {
                files = await response.Content.ReadAsAsync<Files>();
            }
            return files;
        }

        public async Task<File> GetFileAsync(int fileId)
        {
            File file = null;
            HttpResponseMessage response = await httpClient.GetAsync("/api/file/" + fileId);
            if (response.IsSuccessStatusCode)
            {
                file = await response.Content.ReadAsAsync<File>();
            }
            return file;
        }

        public async Task<File> GetRandomFileAsync()
        {
            File file = null;
            HttpResponseMessage response = await httpClient.GetAsync("/api/randomfile");
            if (response.IsSuccessStatusCode)
            {
                file = await response.Content.ReadAsAsync<File>();
            }
            return file;
        }

        public async Task<Files> GetRandomFilesAsync(int numFiles)
        {
            Files files = null;
            HttpResponseMessage response = await httpClient.GetAsync("/api/randomfiles/" + numFiles);
            if (response.IsSuccessStatusCode)
            {
                files = await response.Content.ReadAsAsync<Files>();
            }
            return files;
        }

        public async Task<Directories> GetDirectoriesAsync()
        {
            Directories directories = null;
            HttpResponseMessage response = await httpClient.GetAsync("/api/directories");
            if (response.IsSuccessStatusCode)
            {
                directories = await response.Content.ReadAsAsync<Directories>();
            }
            return directories;
        }

        public async Task<Directories> GetFilesystemDirectoriesAsync()
        {
            Directories directories = null;
            HttpResponseMessage response = await httpClient.GetAsync("/api/fs_directories");
            if (response.IsSuccessStatusCode)
            {
                directories = await response.Content.ReadAsAsync<Directories>();
            }
            return directories;
        }

        public async Task<ServerStats> GetServerStatsAsync()
        {
            ServerStats serverStats = null;
            HttpResponseMessage response = await httpClient.GetAsync("/api/stats");
            if (response.IsSuccessStatusCode)
            {
                serverStats = await response.Content.ReadAsAsync<ServerStats>();
            }
            return serverStats;
        }
    }
}
