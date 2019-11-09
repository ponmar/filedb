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

        public string Status
        {
            get => status;
            set
            {
                status = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Status)));
            }
        }

        private string status;

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

        private readonly List<int> fileIds = new List<int>();

        public int FileIndex
        {
            get => fileIndex;
            set
            {
                fileIndex = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(FileIndex)));
                NextFilesAvailable = fileIndex != -1 && fileIndex < fileIds.Count - 1;
                PreviousFilesAvailable = fileIndex > 0;

                // Turn off slideshow if new index is last index
                if (Slideshow && !repeat && (fileIndex == -1 || fileIndex == fileIds.Count - 1))
                {
                    Slideshow = false;
                }

                if (fileIndex != -1)
                {
                    Status = (fileIndex + 1) + " [" + fileIds.Count + "] - Id: " + fileIds[fileIndex];
                    // TODO: use /api/filecontent_reoriented/ if cast device does not reorient image according to exif data? Make this configurable in the gui?
                    FileUrl = filedbUrl + "/api/filecontent/" + fileIds[fileIndex];
                }
                else
                {
                    Status = "No file list loaded";
                    FileUrl = string.Empty;
                }
            }
        }

        private int fileIndex = -1;

        private readonly DispatcherTimer slideshowTimer = new DispatcherTimer();

        private Chromecast selectedChromecast = null;
        private SharpCasterDemoController controller = null;

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

        public MainPageViewModel()
        {
            slideshowTimer = new DispatcherTimer();
            slideshowTimer.Tick += SlideshowTimer_Tick;

            string ipAddr = Utils.GetIPAddress();

            // Init properties
            // Note that localhost is no good hostname for casting to another device on the network
            FiledbUrl = string.IsNullOrEmpty(ipAddr) ? "http://localhost:80" : "http://" + ipAddr + ":80";
            Slideshow = false;
            SlideshowDelay = 3;
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
            fileIds.Clear();
            FileIndex = -1;
        }

        public void Load()
        {
            Reset();

            if (!string.IsNullOrEmpty(FiledbUrl) && !string.IsNullOrEmpty(ExportedFileList))
            {
                foreach (string fileIdStr in ExportedFileList.Split(";"))
                {
                    if (int.TryParse(fileIdStr, out int fileId))
                    {
                        fileIds.Add(fileId);
                    }
                }

                LoadFile(0);

                // Start slideshow if checkbox already selected
                Slideshow = slideshow;
            }
        }

        public void First()
        {
            LoadFile(0);
        }

        public void Previous()
        {
            LoadFile(random ? randomGenerator.Next(0, fileIds.Count) : fileIndex - 1);
        }

        public void Next()
        {
            int newIndex = random ? randomGenerator.Next(0, fileIds.Count) : fileIndex + 1;
            if (repeat && newIndex == fileIds.Count)
            {
                newIndex = 0;
            }
            LoadFile(newIndex);
        }

        public void Last()
        {
            LoadFile(fileIds.Count - 1);
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
            if (index >= 0 && fileIds.Count > 0 && index < fileIds.Count)
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
