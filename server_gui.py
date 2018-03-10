import tkinter
import sys
import filedb


class StdoutRedirector(object):
    def __init__(self, text_widget):
        self.text_space = text_widget

    def write(self, string):
        self.text_space.insert('end', string)
        self.text_space.see('end')

    def flush(self):
        pass


class ServerGUI(tkinter.Frame):
    def __init__(self):
        self.__root = tkinter.Tk()
        tkinter.Frame.__init__(self, self.__root)
        self.pack()
        self.create_widgets()
        self.master.title("FileDB Server")
        self.filedb_thread = None

    def create_widgets(self):
        self.start_button = tkinter.Button(self, text="Start server", command=self.start_server)
        self.stop_button = tkinter.Button(self, text="Stop server", command=self.stop_server)
        self.quit_button = tkinter.Button(self, text="Quit", command=self.quit)
        self.text_box = tkinter.Text(self, wrap='word', height=11, width=50)

        self.start_button.grid(column=0, row=0)
        self.stop_button.grid(column=1, row=0)
        self.quit_button.grid(column=2, row=0)
        self.text_box.grid(column=0, row=1, columnspan=3, sticky='NSWE', padx=5, pady=5)

        sys.stdout = StdoutRedirector(self.text_box)

    def start_server(self):
        if self.filedb_thread is None:
            print('Starting the FileDB server...')

    def stop_server(self):
        if self.filedb_thread is not None:
            pass

    def quit(self):
        self.__root.destroy()


def main():
    """Runs the FileDB server side GUI application."""
    server_gui = ServerGUI()
    server_gui.mainloop()


if __name__ == "__main__":
    main()
