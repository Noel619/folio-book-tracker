using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

internal static class FolioLauncher
{
    private const string LocalUrl = "http://localhost:3000/";

    [STAThread]
    private static void Main()
    {
        string projectDirectory = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);

        if (!File.Exists(Path.Combine(projectDirectory, "package.json")))
        {
            ShowError("No encuentro los archivos de Folio. Mantén Folio.exe dentro de la carpeta del proyecto.");
            return;
        }

        if (ServerIsReady())
        {
            OpenBrowser();
            return;
        }

        if (!CommandExists("node") || !CommandExists("npm"))
        {
            ShowError("Folio necesita Node.js 22 o superior. Instálalo desde nodejs.org y vuelve a abrir Folio.exe.");
            return;
        }

        if (!File.Exists(Path.Combine(projectDirectory, "dist", "server", "index.js")))
        {
            if (!RunAndWait("npm run build", projectDirectory, 120000))
            {
                ShowError("No se pudo preparar Folio. Revisa el archivo .folio-launcher.log dentro de la carpeta.");
                return;
            }
        }

        StartHidden("npm run start", projectDirectory, ".folio-server.log");

        for (int attempt = 0; attempt < 45; attempt++)
        {
            Thread.Sleep(1000);
            if (ServerIsReady())
            {
                OpenBrowser();
                return;
            }
        }

        ShowError("Folio tardó demasiado en iniciar. Revisa el archivo .folio-server.log dentro de la carpeta.");
    }

    private static bool ServerIsReady()
    {
        try
        {
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(LocalUrl);
            request.Method = "GET";
            request.Timeout = 900;
            request.ReadWriteTimeout = 900;
            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            {
                return (int)response.StatusCode >= 200 && (int)response.StatusCode < 500;
            }
        }
        catch
        {
            return false;
        }
    }

    private static bool CommandExists(string command)
    {
        try
        {
            ProcessStartInfo info = new ProcessStartInfo("where.exe", command);
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            using (Process process = Process.Start(info))
            {
                process.WaitForExit(5000);
                return process.ExitCode == 0;
            }
        }
        catch
        {
            return false;
        }
    }

    private static bool RunAndWait(string command, string directory, int timeoutMilliseconds)
    {
        try
        {
            string logPath = Path.Combine(directory, ".folio-launcher.log");
            ProcessStartInfo info = new ProcessStartInfo("cmd.exe", "/d /s /c \"" + command + " > \"\"" + logPath + "\"\" 2>&1\"");
            info.WorkingDirectory = directory;
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            using (Process process = Process.Start(info))
            {
                if (!process.WaitForExit(timeoutMilliseconds))
                {
                    try { process.Kill(); } catch { }
                    return false;
                }
                return process.ExitCode == 0;
            }
        }
        catch
        {
            return false;
        }
    }

    private static void StartHidden(string command, string directory, string logFile)
    {
        string logPath = Path.Combine(directory, logFile);
        ProcessStartInfo info = new ProcessStartInfo("cmd.exe", "/d /s /c \"" + command + " > \"\"" + logPath + "\"\" 2>&1\"");
        info.WorkingDirectory = directory;
        info.UseShellExecute = false;
        info.CreateNoWindow = true;
        Process.Start(info);
    }

    private static void OpenBrowser()
    {
        ProcessStartInfo info = new ProcessStartInfo("cmd.exe", "/d /c start \"\" \"" + LocalUrl + "\"");
        info.UseShellExecute = false;
        info.CreateNoWindow = true;
        Process.Start(info);
    }

    private static void ShowError(string message)
    {
        MessageBox.Show(message, "Folio", MessageBoxButtons.OK, MessageBoxIcon.Error);
    }
}
