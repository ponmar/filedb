using SharpCaster.Models;
using SharpCaster.Services;
using SharpCaster.Controllers;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Windows;
using System.Windows.Threading;
using System.Threading.Tasks;
using System.Windows.Input;
using FileDbApi;

namespace FileDbCast
{
    public class MainPageViewModel : INotifyPropertyChanged
    {
        public event PropertyChangedEventHandler PropertyChanged;

        private readonly ChromecastService chromecastService = ChromecastService.Current;

        public ObservableCollection<Chromecast> Chromecasts
        {
            get => chromecasts;
            set
            {
                chromecasts = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Chromecasts)));
            }
        }

        private ObservableCollection<Chromecast> chromecasts;

        public string CastDeviceStatus
        {
            get => castDeviceStatus;
            set
            {
                castDeviceStatus = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(CastDeviceStatus)));
            }
        }

        private string castDeviceStatus;

        public string FiledbUrl
        {
            get => filedbUrl;
            set
            {
                filedbUrl = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(FiledbUrl)));
            }
        }

        private string filedbUrl = string.Empty;

        public int SlideshowDelay
        {
            get => slideshowDelay;
            set
            {
                slideshowDelay = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(SlideshowDelay)));
            }
        }

        private int slideshowDelay;

        public bool Preview
        {
            get => preview;
            set
            {
                preview = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Preview)));
                if (preview)
                {
                    PreviewVisibility = Visibility.Visible;
                }
                else
                {
                    PreviewVisibility = Visibility.Collapsed;
                }
            }
        }

        private bool preview;

        public Visibility PreviewVisibility
        {
            get => previewVisibility;
            private set
            {
                previewVisibility = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(PreviewVisibility)));
            }
        }

        Visibility previewVisibility;

        public string FileUrl
        {
            get => fileUrl;
            private set
            {
                fileUrl = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(FileUrl)));
            }
        }

        string fileUrl;

        public bool Slideshow
        {
            get => slideshow;
            set
            {
                slideshow = value;
                if (slideshow)
                {
                    try
                    {
                        slideshowTimer.Interval = new TimeSpan(0, 0, SlideshowDelay);
                        slideshowTimer.Start();
                    }
                    catch (ArgumentOutOfRangeException)
                    {
                        slideshowTimer.Stop();
                    }
                }
                else
                {
                    slideshowTimer.Stop();
                }
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Slideshow)));
            }
        }

        private bool slideshow;

        public bool Random
        {
            get => random;
            set
            {
                random = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Random)));
            }
        }

        private bool random;

        public bool Repeat
        {
            get => repeat;
            set
            {
                repeat = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Repeat)));
            }
        }

        private bool repeat;

        public string ExportedFileList
        {
            get => exportedFileList;
            set
            {
                exportedFileList = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(ExportedFileList)));
            }
        }

        private string exportedFileList;

        public string FileBrowserStatus
        {
            get => fileBrowserStatus;
            set
            {
                fileBrowserStatus = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(FileBrowserStatus)));
            }
        }

        private string fileBrowserStatus;

        public bool NextFilesAvailable
        {
            get => nextFilesAvailable;
            private set
            {
                nextFilesAvailable = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(NextFilesAvailable)));
            }
        }

        private bool nextFilesAvailable;

        public bool PreviousFilesAvailable
        {
            get => previousFilesAvailable;
            private set
            {
                previousFilesAvailable = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(PreviousFilesAvailable)));
            }
        }

        private bool previousFilesAvailable;

        public string FileDateTime
        {
            get => fileDateTime;
            set
            {
                fileDateTime = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(FileDateTime)));
            }
        }

        private string fileDateTime;

        public string FilePath
        {
            get => filePath;
            set
            {
                filePath = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(FilePath)));
            }
        }

        private string filePath;

        public string FileDescription
        {
            get => fileDescription;
            set
            {
                fileDescription = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(FileDescription)));
            }
        }

        private string fileDescription;

        public string FilePosition
        {
            get => filePosition;
            set
            {
                filePosition = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(FilePosition)));
            }
        }

        private string filePosition;

        private Files files;

        public int FileIndex
        {
            get => fileIndex;
            set
            {
                fileIndex = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(FileIndex)));
                NextFilesAvailable = fileIndex != -1 && fileIndex < files.files.Count - 1;
                PreviousFilesAvailable = fileIndex > 0;

                // Turn off slideshow if new index is last index
                if (Slideshow && !repeat && (fileIndex == -1 || fileIndex == files.files.Count - 1))
                {
                    Slideshow = false;
                }

                if (fileIndex != -1)
                {
                    File file = files.files[fileIndex];
                    FileBrowserStatus = "[" + (fileIndex + 1) + "/" + files.files.Count + "]";
                    FileUrl = filedbClient.GetFileContentUrl(file.id, reorient);
                    FilePath = file.path;
                    FileDescription = file.description;
                    FileDateTime = string.IsNullOrEmpty(file.datetime) ? string.Empty : file.datetime.Replace('T', ' ');
                    FilePosition = file.position;
                }
                else
                {
                    FileBrowserStatus = "No file list loaded";
                    FileUrl = string.Empty;
                    FilePath = string.Empty;
                    FileDescription = string.Empty;
                    FileDateTime = string.Empty;
                    FilePosition = string.Empty;
                }
            }
        }

        private int fileIndex = -1;

        public bool Reorient
        {
            get => reorient;
            set
            {
                reorient = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Reorient)));
                LoadFile(fileIndex);
            }
        }

        bool reorient;

        private readonly DispatcherTimer slideshowTimer = new DispatcherTimer();

        private Chromecast selectedChromecast = null;
        private SharpCasterDemoController controller = null;

        public ICommand LoadCommand
        {
            get
            {
                return loadCommand ?? (loadCommand = new ActionCommand(() => { LoadAsync(); }));
            }
        }

        private ICommand loadCommand;

        public ICommand NextCommand
        {
            get
            {
                return nextCommand ?? (nextCommand = new ActionCommand(() => { Next(); }));
            }
        }

        private ICommand nextCommand;

        public ICommand PreviousCommand
        {
            get
            {
                return previousCommand ?? (previousCommand = new ActionCommand(() => { Previous(); }));
            }
        }

        private ICommand previousCommand;

        public ICommand FirstCommand
        {
            get
            {
                return firstCommand ?? (firstCommand = new ActionCommand(() => { First(); }));
            }
        }

        private ICommand firstCommand;

        public ICommand LastCommand
        {
            get
            {
                return lastCommand ?? (lastCommand = new ActionCommand(() => { Last(); }));
            }
        }

        private ICommand lastCommand;

        private readonly Random randomGenerator = new Random();

        private FileDbClient filedbClient;

        public MainPageViewModel()
        {
            slideshowTimer = new DispatcherTimer();
            slideshowTimer.Tick += SlideshowTimer_Tick;

            string ipAddr = Utils.GetIPAddress();

            // Init properties
            // Note that localhost is no good hostname for casting to another device on the network
            FiledbUrl = string.IsNullOrEmpty(ipAddr) ? "http://localhost:80" : "http://" + ipAddr + ":80";
            Reorient = true;
            Slideshow = false;
            SlideshowDelay = 4;
            Preview = false;
            Random = false;
            Repeat = false;
            ExportedFileList = string.Empty;
            CastDeviceStatus = string.Empty;
            Chromecasts = new ObservableCollection<Chromecast>();

            LoadCromecasts();
        }

        private async void LoadCromecasts()
        {
            var foundChromecasts = await chromecastService.StartLocatingDevices();
            foreach (var foundChromecast in foundChromecasts)
            {
                Chromecasts.Add(foundChromecast);
            }
        }

        private void Reset()
        {
            files = null;
            FileIndex = -1;
        }

        private async Task LoadAsync()
        {
            Reset();

            if (!string.IsNullOrEmpty(FiledbUrl) && !string.IsNullOrEmpty(ExportedFileList))
            {
                var inputFileIds = new List<int>();
                foreach (string fileIdStr in ExportedFileList.Split(";"))
                {
                    if (int.TryParse(fileIdStr, out int fileId))
                    {
                        inputFileIds.Add(fileId);
                    }
                }

                if (inputFileIds.Count > 0)
                {
                    filedbClient = new FileDbClient(FiledbUrl);
                    var fileIds = new FileIds
                    {
                        files = inputFileIds
                    };

                    files = await filedbClient.GetFilesAsync(fileIds);
                    if (files != null)
                    {
                        LoadFile(0);

                        // Start slideshow if checkbox already selected
                        Slideshow = slideshow;
                    }
                }
            }
        }

        private void First()
        {
            LoadFile(0);
        }

        private void Previous()
        {
            LoadFile(random ? randomGenerator.Next(0, files.files.Count) : fileIndex - 1);
        }

        private void Next()
        {
            int newIndex = random ? randomGenerator.Next(0, files.files.Count) : fileIndex + 1;
            if (repeat && newIndex == files.files.Count)
            {
                newIndex = 0;
            }
            LoadFile(newIndex);
        }

        private void Last()
        {
            LoadFile(files.files.Count - 1);
        }

        public void SelectCastDevice(Chromecast cc)
        {
            CastDeviceStatus = "Loading...";

            selectedChromecast = cc;

            ChromecastService.Current.ChromeCastClient.ConnectedChanged +=
            async delegate
            {
                if (controller == null)
                {
                    controller = await ChromecastService.Current.ChromeCastClient.LaunchSharpCaster();
                }
            };

            ChromecastService.Current.ChromeCastClient.ApplicationStarted +=
            async delegate
            {
                while (controller == null)
                {
                    await Task.Delay(500);
                }

                // TODO: run in gui thread?
                CastDeviceStatus = "Ready";

                // TODO: do not use controller until this event has been received?
            };
            ChromecastService.Current.ConnectToChromecast(selectedChromecast);
        }

        private void LoadFile(int index)
        {
            if (index >= 0 && files.files.Count > 0 && index < files.files.Count)
            {
                FileIndex = index;
            }

            if (selectedChromecast != null && controller != null && FileUrl != string.Empty)
            {
                controller.LoadMedia(FileUrl, "image/jpeg", null, "BUFFERED");
                controller.Play();
            }
        }

        private void SlideshowTimer_Tick(object sender, EventArgs e)
        {
            NextCommand.Execute(this);
        }
    }
}
