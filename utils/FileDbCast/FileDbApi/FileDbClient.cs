using Newtonsoft.Json;
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

namespace FileDbApi
{
    public class FileDbClient
    {
        private readonly HttpClient client = new HttpClient();

        public FileDbClient(string filedbUrl)
        {
            client.BaseAddress = new Uri(filedbUrl);
            client.DefaultRequestHeaders.Accept.Clear();
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }

        public async Task<Persons> GetPersonsAsync()
        {
            Persons persons = null;
            HttpResponseMessage response = await client.GetAsync("/api/persons");
            if (response.IsSuccessStatusCode)
            {
                persons = await response.Content.ReadAsAsync<Persons>();
            }
            return persons;
        }

        public async Task<Person> GetPersonAsync(int personId)
        {
            Person person = null;
            HttpResponseMessage response = await client.GetAsync("/api/person/" + personId);
            if (response.IsSuccessStatusCode)
            {
                person = await response.Content.ReadAsAsync<Person>();
            }
            return person;
        }

        public async Task<Locations> GetLocationsAsync()
        {
            Locations locations = null;
            HttpResponseMessage response = await client.GetAsync("/api/locations");
            if (response.IsSuccessStatusCode)
            {
                locations = await response.Content.ReadAsAsync<Locations>();
            }
            return locations;
        }

        public async Task<Location> GetLocationAsync(int locationId)
        {
            Location location = null;
            HttpResponseMessage response = await client.GetAsync("/api/location/" + locationId);
            if (response.IsSuccessStatusCode)
            {
                location = await response.Content.ReadAsAsync<Location>();
            }
            return location;
        }

        public async Task<Tags> GetTagsAsync()
        {
            Tags tags = null;
            HttpResponseMessage response = await client.GetAsync("/api/tags");
            if (response.IsSuccessStatusCode)
            {
                tags = await response.Content.ReadAsAsync<Tags>();
            }
            return tags;
        }

        public async Task<Tag> GetTagAsync(int tagId)
        {
            Tag tag = null;
            HttpResponseMessage response = await client.GetAsync("/api/tag/" + tagId);
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
            HttpResponseMessage response = await client.PostAsync("/api/files", content);
            if (response.IsSuccessStatusCode)
            {
                files = await response.Content.ReadAsAsync<Files>();
            }
            return files;
        }

        public async Task<File> GetFileAsync(int fileId)
        {
            File file = null;
            HttpResponseMessage response = await client.GetAsync("/api/file/" + fileId);
            if (response.IsSuccessStatusCode)
            {
                file = await response.Content.ReadAsAsync<File>();
            }
            return file;
        }
    }
}
