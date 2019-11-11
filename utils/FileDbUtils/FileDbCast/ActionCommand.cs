using System;
using System.Collections.Generic;
using System.Text;
using System.Windows.Input;

namespace FileDbCast
{
    class ActionCommand : ICommand
    {
        private readonly Action action;

        public ActionCommand(Action action)
        {
            this.action = action;
        }

        public void Execute(object parameter)
        {
            action();
        }

        public bool CanExecute(object parameter)
        {
            return true;
        }

        public event EventHandler CanExecuteChanged;
    }
}
