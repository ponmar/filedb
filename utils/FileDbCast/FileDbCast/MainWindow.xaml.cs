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

        private void LoadButton_Click(object sender, RoutedEventArgs e)
        {
            MainPageViewModel.Load();
        }

        private void FirstButton_Click(object sender, RoutedEventArgs e)
        {
            MainPageViewModel.First();
        }

        private void PreviousButton_Click(object sender, RoutedEventArgs e)
        {
            MainPageViewModel.Previous();
        }

        private void NextButton_Click(object sender, RoutedEventArgs e)
        {
            MainPageViewModel.Next();
        }

        private void LastButton_Click(object sender, RoutedEventArgs e)
        {
            MainPageViewModel.Last();
        }

        private void ComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            ComboBox comboBox = (ComboBox)sender;
            Chromecast cc = (Chromecast)comboBox.SelectedItem;
            MainPageViewModel.SelectCastDevice(cc);
        }
    }
}
