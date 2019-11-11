using SharpCaster.Models;
using System.Windows;
using System.Windows.Controls;

namespace FileDbCast
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        public MainPageViewModel MainPageViewModel { get; set; }

        public MainWindow()
        {
            InitializeComponent();

            MainPageViewModel = new MainPageViewModel();
            DataContext = MainPageViewModel;
        }

        private void ComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            ComboBox comboBox = (ComboBox)sender;
            Chromecast cc = (Chromecast)comboBox.SelectedItem;
            MainPageViewModel.SelectCastDevice(cc);
        }
    }
}
