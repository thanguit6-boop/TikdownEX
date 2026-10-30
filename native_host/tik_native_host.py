# -*- coding: utf-8 -*-
"""Cầu nối Native Messaging cho extension Tik Video Toolkit: "Mở app sửa video".

Chrome không cho extension tự mở file .exe / chạy PowerShell. File này là phần
"cầu nối" chạy trên máy: Chrome khởi động nó (qua tik_native_host.bat), extension
gửi 1 tin nhắn JSON, host mở app sửa video kèm đường dẫn video rồi trả lời.

KÊNH TRAO ĐỔI: stdin/stdout, mỗi tin nhắn = 4 byte độ dài (little-endian) + JSON
UTF-8. Vì stdout là kênh trả lời cho Chrome nên TUYỆT ĐỐI không print() gì ra đó
(file này tự chuyển sys.stdout sang stderr cho chắc). Log nằm ở
%LOCALAPPDATA%\\TikVideoToolkit\\native_host.log.

TIN NHẮN extension -> host (trường "id" nếu có sẽ được trả nguyên lại):
  {"action": "ping"}
      -> {"ok": true, "host": "...", "version": 4, "platform": "win32", "python": "3.x.y"}
  {"action": "check_app", "appPath": "D:\\\\App\\\\popup_select_video.exe"}
      -> {"ok": true, "kind": "exe" | "py", "appPath": "..."}   (chỉ kiểm tra, không mở gì)
  {"action": "choose_folder", "initialPath": "D:\\Video"}
      -> {"ok": true, "cancelled": false, "path": "D:\\Video", "name": "Video"}
         (mở hộp thoại chọn thư mục kiểu Explorer của Windows; cancelled=true nếu người
         dùng bấm Hủy. initialPath tùy chọn: hộp thoại mở sẵn ở thư mục đó, nếu thư mục đã
         mất thì mở ở thư mục cha gần nhất còn tồn tại; bỏ trống thì mở ở vị trí mặc định)
  {"action": "choose_app_file"}
      -> {"ok": true, "cancelled": false, "path": "D:\\App\\popup_select_video.py",
          "kind": "exe" | "py"}
         (mở hộp thoại chọn file .exe/.py; cancelled=true nếu người dùng bấm Hủy)
  {"action": "open_video", "appPath": "<đường dẫn đầy đủ .exe hoặc .py>",
   "videoPath": "<đường dẫn đầy đủ video>"}
      -> {"ok": true, "mode": "exe" | "py", "pid": 1234}
  {"action": "open_saved_video", "appPath": "...", "rootPath": "D:\\Video",
   "folderName": "Khách A" | "", "fileName": "video.mp4", "rootToken": "..."}
      -> ghép và kiểm tra file D:\\Video\\Khách A\\video.mp4 hoặc D:\\Video\\video.mp4,
         rồi mở app (folderName rỗng = thư mục gốc).
  {"action": "locate_folder", "folderName": "Video", "rootToken": "...",
   "hints": ["D:\\Video"], "seconds": 20}
      -> {"ok": true, "found": true, "path": "D:\\Video", "name": "Video"}
         hoặc {"ok": true, "found": false, "reason": "not_found" | "timeout"}
         Tìm thư mục tên folderName có file marker .tvt chứa đúng rootToken. Chrome chỉ
         cho extension biết TÊN thư mục đã chọn trong "Video đã chọn"; extension vừa ghi
         marker mới vào đó nên chỉ thư mục này khớp, kể cả khi nhiều thư mục trùng tên.
         Thử "hints" trước (đường dẫn gợi ý, kèm thư mục con/anh em cùng tên), rồi quét
         theo từng lớp thư mục (thư mục người dùng trước, sau đó ổ cố định/USB) và dừng
         ở "seconds" (tối đa 25 giây).
  {"action": "open_folder", "rootPath": "D:\\Video", "rootToken": "..."}
      -> {"ok": true, "action": "open_folder", "path": "D:\\Video"}
         Mở thư mục đó trong Explorer (nút "Mở thư mục" của popup "Video đã chọn"). Giống
         open_saved_video: thư mục phải có file marker .tvt chứa đúng rootToken, nên chỉ mở
         được thư mục mà extension vừa xác nhận, không mở được thư mục tùy ý.
  Lỗi luôn có dạng {"ok": false, "error": "<mã>", "message": "<tiếng Việt>"}.
  Mã lỗi: bad_request, unknown_action, unsupported_os, app_path_missing,
  app_path_invalid, app_not_found, app_bad_type, video_path_missing,
  video_path_invalid, video_not_found, video_bad_type, root_path_missing,
  root_path_invalid, root_path_not_found, folder_name_invalid,
  file_name_invalid, root_token_invalid, root_token_mismatch,
  root_marker_write_failed, folder_picker_failed, app_picker_failed,
  app_picker_timeout, launch_failed, internal_error.

CÁCH MỞ APP (chọn theo đuôi file của appPath):
  .exe : chạy  <exe> --from-main-app --open-video "<video>" [--open-root
         "<root>"] [--open-folder "<folder>"]  (bản .exe của
         popup_select_video tự thoát nếu thiếu cờ --from-main-app).
  .py  : chạy  py <file.py> --from-main-app --open-video "<video>"
         [--open-root "<root>"] [--open-folder "<folder>"]
         trong thư mục của file .py, KHÔNG hiện cửa sổ console (CREATE_NO_WINDOW).
         Chữ app in ra (kể cả lỗi) được ghi vào
         %LOCALAPPDATA%\\TikVideoToolkit\\editor_app.log.
         Muốn xem lỗi trực tiếp như bản cũ: đặt biến môi trường TIKVT_SHOW_CONSOLE=1
         rồi mở lại Chrome -> app mở trong 1 cửa sổ PowerShell mới, tự đóng khi app
         thoát bình thường, giữ lại để đọc thông báo nếu app thoát với lỗi.
  Host chỉ mở app rồi trả lời ngay, KHÔNG đợi app chạy xong.

DÒNG LỆNH (chạy bằng `py tik_native_host.py ...`, không cần Chrome):
  --install [ID ...]   ghi file khai báo + khóa registry của Chrome (HKCU).
                       Bỏ trống ID thì TỰ DÒ extension "Tik Video Toolkit" trong
                       các profile của Chrome (chạy lại lệnh này nếu ID đổi, ví dụ
                       nạp extension từ thư mục khác); dò không ra thì KHÔNG dùng lại ID
                       trong file .json (có thể là ID của máy khác) mà báo lỗi mã 2 để
                       người dùng nhập ID. Muốn tự chỉ ID: copy ở chrome://extensions.
  --detect             chỉ liệt kê extension dò được trong Chrome, không ghi gì.
  --uninstall          xóa khóa registry.
  --status             xem trạng thái cài đặt.
  --open-test APP VIDEO
                       chạy đúng đường mở app của action open_video, để thử
                       mà chưa cần extension.
  --simulate-chrome [JSON]
                       chạy tik_native_host.bat giống hệt cách Chrome chạy, gửi 1
                       tin nhắn (mặc định {"action": "ping"}) và in câu trả lời.

BẢN .EXE (máy user không cần cài Python):
  Chạy build_exe.bat (cần Python + PyInstaller, CHỈ trên máy người đóng gói) để tạo
  tik_native_host.exe cạnh file này. Máy user chỉ cần thư mục native_host có file .exe
  (file .json tự được tạo khi cài, không cần gửi kèm), rồi chạy install_native_host_exe.bat.
  Các lệnh --install, --status,
  --uninstall... dùng y hệt, chỉ thay `py tik_native_host.py` bằng `tik_native_host.exe`.
  File khai báo .json dùng chung cho 2 chế độ: lần --install gần nhất quyết định Chrome
  chạy .exe hay .bat.
"""

import base64
import collections
import json
import os
import re
import secrets
import shutil
import struct
import subprocess
import sys
import tempfile
import time
import traceback

HOST_NAME = "com.tik_video_toolkit.editor_bridge"
HOST_VERSION = 4
# Bản đóng gói PyInstaller (.exe): __file__ trỏ vào thư mục tạm lúc giải nén, nên lấy
# thư mục chứa chính file .exe làm HERE (nơi đặt file khai báo .json).
FROZEN = bool(getattr(sys, "frozen", False))
HERE = os.path.dirname(os.path.abspath(sys.executable if FROZEN else __file__))
HOST_BAT = "tik_native_host.bat"
# File mà Chrome sẽ chạy: bản .exe thì chính nó, bản Python thì wrapper .bat.
HOST_LAUNCHER = os.path.basename(sys.executable) if FROZEN else HOST_BAT
MANIFEST_FILE = HOST_NAME + ".json"
REGISTRY_SUBKEY = "Software\\Google\\Chrome\\NativeMessagingHosts\\" + HOST_NAME
EXTENSION_PLACEHOLDER = "REPLACE_WITH_EXTENSION_ID"

# Nhận diện extension khi tự dò ID: tên + 1 host_permissions riêng của sản phẩm. Chỉ
# khớp tên thì chưa đủ, vì ID dò ra sẽ được cấp quyền gọi host (mở app), nên không
# cấp cho extension lạ chỉ vì trùng tên.
EXTENSION_NAME = "Tik Video Toolkit"
EXTENSION_HOST_MARKER = "clipmaster.thangpham.io.vn"

# Giữ khớp với VIDEO_EXTENSIONS trong popup_select_video.py.
VIDEO_EXTENSIONS = {
    ".mp4", ".mkv", ".avi", ".mov", ".wmv",
    ".flv", ".webm", ".m4v", ".mpg", ".mpeg",
}
APP_EXTENSIONS = {".exe", ".py"}
ROOT_MARKER_FILE = ".tvt"  # giữ khớp EDITOR_ROOT_MARKER_FILE trong multi-select.js
# Thuộc tính file Windows: marker được ẩn + đánh dấu file hệ thống.
FILE_ATTRIBUTE_HIDDEN = 0x2
FILE_ATTRIBUTE_SYSTEM = 0x4
FILE_ATTRIBUTE_NORMAL = 0x80

# locate_folder: quét theo từng lớp thư mục để tìm marker .tvt. Thời gian chờ phải
# nhỏ hơn 30 giây (service worker của Chrome ngủ sau 30 giây không có sự kiện).
LOCATE_DEFAULT_SECONDS = 20
LOCATE_MAX_SECONDS = 25
LOCATE_MAX_DEPTH = 8
LOCATE_MAX_HINTS = 8
DRIVE_REMOVABLE = 2
DRIVE_FIXED = 3
# Thư mục hệ thống/khổng lồ không bao giờ chứa video của người dùng: bỏ qua cho nhanh.
LOCATE_SKIP_DIRS = {
    "windows", "program files", "program files (x86)", "programdata", "appdata",
    "system volume information", "recovery", "msocache", "perflogs",
    "node_modules", ".git",
}

MAX_TEXT_LEN = 1024            # độ dài tối đa của 1 đường dẫn nhận từ extension
MAX_INCOMING_BYTES = 1024 * 1024  # tin nhắn gửi tới host chỉ nhỏ xíu, chặn cái quá khổ

# Cờ tạo tiến trình của Windows (subprocess.* chỉ có trên Windows nên ghi số sẵn).
DETACHED_PROCESS = 0x00000008
CREATE_NEW_CONSOLE = 0x00000010
CREATE_NEW_PROCESS_GROUP = 0x00000200
CREATE_BREAKAWAY_FROM_JOB = 0x01000000
CREATE_NO_WINDOW = 0x08000000
ERROR_ACCESS_DENIED = 5

# Script PowerShell cố định. Đường dẫn KHÔNG nhúng vào script mà đi qua biến môi
# trường (TIKVT_*), nên tên file có dấu cách, dấu nháy ' ’ hay tiếng Việt đều
# không làm hỏng cú pháp.
POWERSHELL_SCRIPT = r"""
$Host.UI.RawUI.WindowTitle = 'Tik Video Toolkit - Mở app sửa video'
$code = 1
try {
    Set-Location -LiteralPath $env:TIKVT_APP_DIR
    $py = if ($env:TIKVT_PYTHON_EXE -and (Test-Path -LiteralPath $env:TIKVT_PYTHON_EXE)) {
        $env:TIKVT_PYTHON_EXE
    } elseif (Get-Command py -ErrorAction SilentlyContinue) {
        'py'
    } else {
        'python'
    }
    $launchArgs = @('--from-main-app', '--open-video', $env:TIKVT_VIDEO)
    if ($env:TIKVT_ROOT) { $launchArgs += @('--open-root', $env:TIKVT_ROOT) }
    if ($env:TIKVT_FOLDER) { $launchArgs += @('--open-folder', $env:TIKVT_FOLDER) }
    & $py $env:TIKVT_PY_FILE @launchArgs
    $code = $LASTEXITCODE
} catch {
    Write-Host $_ -ForegroundColor Red
}
if ($code -ne 0) {
    Write-Host ''
    Write-Host ('App thoát với mã lỗi ' + $code + '. Xem thông báo phía trên.') -ForegroundColor Yellow
    Read-Host 'Nhấn Enter để đóng cửa sổ này' | Out-Null
}
"""

# Dùng hộp thoại gốc của Windows để lấy đường dẫn tuyệt đối mà Chrome cố ý
# không công khai qua File System Access API. Script này luôn được chạy trong
# tiến trình PowerShell riêng, stdout được Python thu lại nên không lẫn vào
# kênh Native Messaging.
POWERSHELL_PICK_FOLDER_SCRIPT = r"""
# Hộp thoại chọn thư mục kiểu Explorer (IFileOpenDialog + FOS_PICKFOLDERS) mở sẵn ở
# thư mục gốc cũ (biến môi trường TIKVT_INITIAL_PATH, có thể rỗng). Nếu không dựng được
# (Add-Type hỏng, COM lỗi) thì quay về hộp thoại cũ FolderBrowserDialog.
$initial = $env:TIKVT_INITIAL_PATH
$title = 'Chọn thư mục gốc để mở video trong app sửa video'
$source = @'
using System;
using System.Runtime.InteropServices;

public static class TikFolderPicker
{
    private const uint FOS_NOCHANGEDIR = 0x00000008;
    private const uint FOS_PICKFOLDERS = 0x00000020;
    private const uint FOS_FORCEFILESYSTEM = 0x00000040;
    private const uint FOS_PATHMUSTEXIST = 0x00000800;
    private const uint SIGDN_FILESYSPATH = 0x80058000;
    private const int HR_CANCELLED = unchecked((int)0x800704C7);

    [ComImport, Guid("DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7")]
    private class FileOpenDialogCom { }

    [ComImport, Guid("42F85136-DB7E-439C-85F1-E4075D135FC8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IFileDialog
    {
        [PreserveSig] int Show(IntPtr parent);
        void SetFileTypes(uint cFileTypes, IntPtr rgFilterSpec);
        void SetFileTypeIndex(uint iFileType);
        void GetFileTypeIndex(out uint piFileType);
        void Advise(IntPtr pfde, out uint pdwCookie);
        void Unadvise(uint dwCookie);
        void SetOptions(uint fos);
        void GetOptions(out uint pfos);
        void SetDefaultFolder(IShellItem psi);
        void SetFolder(IShellItem psi);
        void GetFolder(out IShellItem ppsi);
        void GetCurrentSelection(out IShellItem ppsi);
        void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string pszName);
        void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string pszName);
        void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string pszTitle);
        void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string pszText);
        void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string pszLabel);
        void GetResult(out IShellItem ppsi);
        void AddPlace(IShellItem psi, int fdap);
        void SetDefaultExtension([MarshalAs(UnmanagedType.LPWStr)] string pszDefaultExtension);
        void Close([MarshalAs(UnmanagedType.Error)] int hr);
        void SetClientGuid(ref Guid guid);
        void ClearClientData();
        void SetFilter(IntPtr pFilter);
    }

    [ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IShellItem
    {
        void BindToHandler(IntPtr pbc, ref Guid bhid, ref Guid riid, out IntPtr ppv);
        void GetParent(out IShellItem ppsi);
        void GetDisplayName(uint sigdnName, [MarshalAs(UnmanagedType.LPWStr)] out string ppszName);
        void GetAttributes(uint sfgaoMask, out uint psfgaoAttribs);
        void Compare(IShellItem psi, uint hint, out int piOrder);
    }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
    private static extern void SHCreateItemFromParsingName(
        [MarshalAs(UnmanagedType.LPWStr)] string pszPath, IntPtr pbc, ref Guid riid,
        [MarshalAs(UnmanagedType.Interface)] out IShellItem ppv);

    // Returns the chosen folder path, or null when the user cancelled.
    // Opens inside initialPath when it is given and exists.
    public static string Pick(string title, string initialPath)
    {
        IFileDialog dialog = (IFileDialog)new FileOpenDialogCom();
        uint options;
        dialog.GetOptions(out options);
        dialog.SetOptions(options | FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM | FOS_NOCHANGEDIR | FOS_PATHMUSTEXIST);
        dialog.SetTitle(title);
        if (!string.IsNullOrEmpty(initialPath))
        {
            try
            {
                Guid iid = typeof(IShellItem).GUID;
                IShellItem folder;
                SHCreateItemFromParsingName(initialPath, IntPtr.Zero, ref iid, out folder);
                dialog.SetFolder(folder);
            }
            catch (Exception)
            {
                // Bad or vanished path: the dialog just opens where Windows wants.
            }
        }
        int hr = dialog.Show(IntPtr.Zero);
        if (hr == HR_CANCELLED) return null;
        if (hr != 0) Marshal.ThrowExceptionForHR(hr);
        IShellItem result;
        dialog.GetResult(out result);
        string path;
        result.GetDisplayName(SIGDN_FILESYSPATH, out path);
        return path;
    }
}
'@
$picked = $null
$modern = $false
try {
    Add-Type -TypeDefinition $source -ErrorAction Stop
    $picked = [TikFolderPicker]::Pick($title, $initial)
    $modern = $true
} catch {
    $modern = $false
}
if (-not $modern) {
    Add-Type -AssemblyName System.Windows.Forms
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = $title
    $dialog.ShowNewFolderButton = $false
    if ($initial) { $dialog.SelectedPath = $initial }
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $picked = $dialog.SelectedPath
    }
}
if ($picked) {
    # Ghi thẳng byte UTF-8 để tên thư mục tiếng Việt không phụ thuộc bảng mã của console.
    $bytes = [System.Text.Encoding]::UTF8.GetBytes([string]$picked)
    $out = [Console]::OpenStandardOutput()
    $out.Write($bytes, 0, $bytes.Length)
    $out.Flush()
    exit 0
}
exit 2
"""

POWERSHELL_PICK_APP_SCRIPT = r"""
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = 'Chọn app sửa video'
$dialog.Filter = 'App sửa video (*.exe;*.py)|*.exe;*.py|Tất cả file (*.*)|*.*'
$dialog.FilterIndex = 1
$dialog.Multiselect = $false
$dialog.CheckFileExists = $true
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    [Console]::Out.Write($dialog.FileName)
    exit 0
}
exit 2
"""


# --------------------------------------------------------------------------
# Log
# --------------------------------------------------------------------------

def _log_path():
    base = os.environ.get("LOCALAPPDATA") or tempfile.gettempdir()
    return os.path.join(base, "TikVideoToolkit", "native_host.log")


def log(message):
    """Ghi 1 dòng log; mọi lỗi ghi log đều bị nuốt để không bao giờ làm hỏng host."""
    try:
        path = _log_path()
        os.makedirs(os.path.dirname(path), exist_ok=True)
        try:
            if os.path.getsize(path) > 256 * 1024:
                os.replace(path, path + ".1")
        except OSError:
            pass
        with open(path, "a", encoding="utf-8") as f:
            f.write(time.strftime("%Y-%m-%d %H:%M:%S") + " [" + str(os.getpid()) + "] " + str(message) + "\n")
    except Exception:
        pass


# --------------------------------------------------------------------------
# Giao thức Native Messaging
# --------------------------------------------------------------------------

def read_message(stream):
    """Đọc 1 tin nhắn từ Chrome. Trả về None khi Chrome đã đóng kênh (hết tin)."""
    header = stream.read(4)
    if len(header) < 4:
        return None
    (length,) = struct.unpack("=I", header)
    if length > MAX_INCOMING_BYTES:
        raise ValueError("Tin nhắn quá lớn: %d byte" % length)
    body = stream.read(length)
    if len(body) < length:
        return None
    return json.loads(body.decode("utf-8"))


def write_message(stream, obj):
    data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
    stream.write(struct.pack("=I", len(data)))
    stream.write(data)
    stream.flush()


# --------------------------------------------------------------------------
# Xử lý yêu cầu
# --------------------------------------------------------------------------

class HostError(Exception):
    def __init__(self, code, message):
        Exception.__init__(self, message)
        self.code = code
        self.message = message


def _fail(code, message):
    return {"ok": False, "error": code, "message": message}


def _is_windows():
    return os.name == "nt"


def _clean_path(value, missing_code, invalid_code, what):
    """Chuẩn hoá đường dẫn nhận từ extension (bỏ khoảng trắng và cặp nháy kép
    bao ngoài, kiểu "Copy as path" của Explorer) và bắt buộc là đường dẫn đầy đủ."""
    if value is None or (isinstance(value, str) and not value.strip()):
        raise HostError(missing_code, "Chưa có đường dẫn " + what + ".")
    if not isinstance(value, str):
        raise HostError(invalid_code, "Đường dẫn " + what + " không hợp lệ.")
    path = value.strip()
    if len(path) >= 2 and path[0] == '"' and path[-1] == '"':
        path = path[1:-1].strip()
    if not path or len(path) > MAX_TEXT_LEN or "\x00" in path or "\r" in path or "\n" in path:
        raise HostError(invalid_code, "Đường dẫn " + what + " không hợp lệ.")
    if not os.path.isabs(path):
        raise HostError(
            invalid_code,
            "Đường dẫn " + what + " phải là đường dẫn đầy đủ (ví dụ D:\\Video\\a.mp4): " + path,
        )
    return os.path.normpath(path)


def _check_app(value):
    """Trả về (đường_dẫn_chuẩn_hoá, "exe" | "py") hoặc ném HostError."""
    path = _clean_path(value, "app_path_missing", "app_path_invalid", "app (.exe hoặc .py)")
    if not os.path.isfile(path):
        raise HostError("app_not_found", "Không tìm thấy file app: " + path)
    ext = os.path.splitext(path)[1].lower()
    if ext not in APP_EXTENSIONS:
        raise HostError("app_bad_type", "Chỉ hỗ trợ file app .exe hoặc .py, không phải: " + (ext or "(không có đuôi)"))
    return path, ext[1:]


def _check_video(value):
    path = _clean_path(value, "video_path_missing", "video_path_invalid", "video")
    if not os.path.isfile(path):
        raise HostError("video_not_found", "Không tìm thấy file video: " + path)
    ext = os.path.splitext(path)[1].lower()
    if ext not in VIDEO_EXTENSIONS:
        raise HostError("video_bad_type", "Đuôi file video không được hỗ trợ: " + (ext or "(không có đuôi)"))
    return path


def _spawn(cmd, cwd, flags, env=None, discard_streams=False, log_stream=None):
    """Mở tiến trình độc lập với host và tách job của Chrome nếu có thể.

    Bản .exe không được kế thừa stdout/stderr của Native Messaging: chỉ một
    byte log từ app cũng đủ làm hỏng khung JSON Chrome đang đọc. PowerShell
    của chế độ .py giữ stream riêng để nội dung lỗi hiện trong cửa sổ console.

    log_stream (file đã mở ở chế độ ghi): dùng cho app .py chạy ẩn, stdout/stderr của
    app đi vào file này thay vì cửa sổ console; stdin vẫn bị đóng (DEVNULL).
    """
    stream_options = {}
    if discard_streams:
        stream_options = {
            "stdin": subprocess.DEVNULL,
            "stdout": subprocess.DEVNULL,
            "stderr": subprocess.DEVNULL,
        }
    elif log_stream is not None:
        stream_options = {
            "stdin": subprocess.DEVNULL,
            "stdout": log_stream,
            "stderr": subprocess.STDOUT,
        }
    try:
        return subprocess.Popen(
            cmd, cwd=cwd, env=env, close_fds=True,
            creationflags=flags | CREATE_BREAKAWAY_FROM_JOB, **stream_options
        )
    except OSError as exc:
        if getattr(exc, "winerror", None) != ERROR_ACCESS_DENIED:
            raise
        # Job của Chrome không cho tách (JOB_OBJECT_LIMIT_BREAKAWAY_OK tắt): thử lại
        # không tách. Trường hợp hiếm này app có thể bị đóng theo khi host bị Chrome
        # tắt - xem log nếu gặp.
        log("CREATE_BREAKAWAY_FROM_JOB bị từ chối (ERROR_ACCESS_DENIED), thử lại không có cờ này")
        return subprocess.Popen(cmd, cwd=cwd, env=env, close_fds=True, creationflags=flags, **stream_options)


def _powershell_exe():
    root = os.environ.get("SystemRoot") or "C:\\Windows"
    candidate = os.path.join(root, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
    return candidate if os.path.isfile(candidate) else "powershell.exe"


def _encoded_powershell_command(script, exe=None, sta=False):
    encoded = base64.b64encode(script.encode("utf-16-le")).decode("ascii")
    command = [exe or _powershell_exe(), "-NoLogo", "-NoProfile"]
    if sta:
        command.append("-STA")
    return command + ["-EncodedCommand", encoded]


def _powershell_command(exe=None):
    return _encoded_powershell_command(POWERSHELL_SCRIPT, exe)


def _initial_folder(value):
    """Thư mục để hộp thoại chọn thư mục mở sẵn: đường dẫn thư mục gốc cũ nếu còn;
    đã bị xóa hoặc đổi tên thì lùi dần về thư mục cha gần nhất còn tồn tại.
    Không có hoặc không hợp lệ thì trả "" (hộp thoại mở ở vị trí mặc định)."""
    try:
        path = _clean_path(value, "initial_path_missing", "initial_path_invalid", "thư mục gốc cũ")
    except HostError:
        return ""
    while not os.path.isdir(path):
        parent = os.path.dirname(path)
        if not parent or parent == path:
            return ""
        path = parent
    return path


def choose_folder(initial_path_value=None):
    """Hiện hộp thoại chọn thư mục Windows và trả về đường dẫn tuyệt đối.

    Chrome chỉ trả FileSystemDirectoryHandle cho extension, không hề trả đường
    dẫn hệ điều hành. Host cần biết đường dẫn này để mở đúng file vừa được
    extension lưu trong thư mục con đã chọn.
    """
    if not _is_windows():
        raise HostError("unsupported_os", "Cầu nối này chỉ chạy trên Windows.")
    env = dict(os.environ)
    env["TIKVT_INITIAL_PATH"] = _initial_folder(initial_path_value)
    try:
        proc = subprocess.run(
            _encoded_powershell_command(POWERSHELL_PICK_FOLDER_SCRIPT, sta=True),
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=300,
            creationflags=CREATE_NO_WINDOW,
        )
    except subprocess.TimeoutExpired:
        raise HostError("folder_picker_timeout", "Hộp thoại chọn thư mục đã hết thời gian chờ.")
    except OSError as exc:
        log("folder_picker_failed: " + repr(exc))
        raise HostError("folder_picker_failed", "Không mở được hộp thoại chọn thư mục: " + str(exc))
    if proc.returncode == 2:
        return {"ok": True, "action": "choose_folder", "cancelled": True}
    if proc.returncode != 0:
        detail = proc.stderr.decode("utf-8", "replace").strip()
        log("folder_picker_failed exit=%s stderr=%s" % (proc.returncode, detail))
        raise HostError("folder_picker_failed", "Không mở được hộp thoại chọn thư mục.")
    path = proc.stdout.decode("utf-8", "replace").strip()
    try:
        path = _clean_path(path, "folder_path_missing", "folder_path_invalid", "thư mục gốc")
    except HostError:
        raise HostError("folder_picker_failed", "Hộp thoại không trả về thư mục hợp lệ.")
    if not os.path.isdir(path):
        raise HostError("folder_not_found", "Không tìm thấy thư mục đã chọn: " + path)
    name = os.path.basename(path.rstrip("\\/"))
    if not name:
        raise HostError("folder_path_invalid", "Hãy chọn một thư mục cụ thể, không chọn ngay gốc ổ đĩa.")
    root_token = _write_root_marker(path)
    return {
        "ok": True,
        "action": "choose_folder",
        "cancelled": False,
        "path": path,
        "name": name,
        "rootToken": root_token,
    }


def choose_app_file():
    """Hiện hộp thoại chọn file .exe/.py và kiểm tra ngay file đã chọn."""
    if not _is_windows():
        raise HostError("unsupported_os", "Cầu nối này chỉ chạy trên Windows.")
    try:
        proc = subprocess.run(
            _encoded_powershell_command(POWERSHELL_PICK_APP_SCRIPT, sta=True),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=300,
            creationflags=CREATE_NO_WINDOW,
        )
    except subprocess.TimeoutExpired:
        raise HostError("app_picker_timeout", "Hộp thoại chọn app đã hết thời gian chờ.")
    except OSError as exc:
        log("app_picker_failed: " + repr(exc))
        raise HostError("app_picker_failed", "Không mở được hộp thoại chọn app: " + str(exc))
    if proc.returncode == 2:
        return {"ok": True, "action": "choose_app", "cancelled": True}
    if proc.returncode != 0:
        detail = proc.stderr.decode("utf-8", "replace").strip()
        log("app_picker_failed exit=%s stderr=%s" % (proc.returncode, detail))
        raise HostError("app_picker_failed", "Không mở được hộp thoại chọn app.")
    try:
        app_path, kind = _check_app(proc.stdout.decode("utf-8", "replace").strip())
    except HostError:
        raise HostError("app_picker_failed", "File đã chọn phải là app .exe hoặc .py đang tồn tại.")
    return {"ok": True, "action": "choose_app", "cancelled": False, "path": app_path, "kind": kind}


def _valid_root_token(value):
    return isinstance(value, str) and bool(re.fullmatch(r"[A-Za-z0-9_-]{32,128}", value))


def _marker_path(root_path):
    return os.path.join(root_path, ROOT_MARKER_FILE)


def _set_marker_attributes(path, hidden):
    """Ẩn (hidden=True: Hidden + System) hoặc trả về bình thường (hidden=False) cho file marker.

    Windows không cho ghi đè file đang có thuộc tính Hidden/System, nên trước khi
    ghi phải gỡ thuộc tính, ghi xong mới ẩn lại. Làm "hết sức": lỗi thì bỏ qua,
    marker vẫn dùng được, chỉ là hiện ra trong thư mục.
    """
    if not _is_windows():
        return
    try:
        import ctypes
        attrs = (FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM) if hidden else FILE_ATTRIBUTE_NORMAL
        ctypes.windll.kernel32.SetFileAttributesW(path, attrs)
    except Exception as exc:
        log("marker_attributes_failed: " + repr(exc))


def _write_root_marker(root_path):
    """Ghi mã bí mật vào thư mục gốc đã chọn.

    File System Access API không cho extension biết đường dẫn thật. Marker để
    extension chứng minh handle của Chrome trỏ tới đúng thư mục mà người dùng
    vừa chọn trong hộp thoại Windows, kể cả khi hai thư mục có cùng tên.
    File được ẩn (Hidden + System) ngay sau khi ghi.
    """
    token = secrets.token_urlsafe(32)
    marker = {"schema": 1, "rootToken": token}
    path = _marker_path(root_path)
    temp_path = path + ".tmp-" + str(os.getpid())
    _set_marker_attributes(path, False)  # marker cũ đang ẩn thì không ghi đè được
    try:
        with open(temp_path, "w", encoding="utf-8", newline="\n") as f:
            json.dump(marker, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(temp_path, path)
        _set_marker_attributes(path, True)
    except OSError as exc:
        try:
            os.remove(temp_path)
        except OSError:
            pass
        log("root_marker_write_failed: " + repr(exc))
        raise HostError(
            "root_marker_write_failed",
            "Không thể tạo file xác nhận trong thư mục gốc. Hãy chọn thư mục có quyền ghi.",
        )
    return token


def _read_root_marker(root_path):
    try:
        with open(_marker_path(root_path), "r", encoding="utf-8-sig") as f:
            marker = json.load(f)
    except (OSError, ValueError):
        return ""
    token = marker.get("rootToken") if isinstance(marker, dict) else ""
    if not _valid_root_token(token):
        return ""
    # Marker do extension tạo (Chrome không đặt được thuộc tính file) thì host ẩn hộ.
    _set_marker_attributes(_marker_path(root_path), True)
    return token


def _safe_child_name(value, code, what, allowed_extensions=None):
    """Nhận đúng MỘT tên con, không bao giờ nhận đường dẫn tương đối/.. ."""
    if not isinstance(value, str):
        raise HostError(code, "Tên " + what + " không hợp lệ.")
    name = value.strip()
    if not name or len(name) > 255 or "\x00" in name or "\r" in name or "\n" in name:
        raise HostError(code, "Tên " + what + " không hợp lệ.")
    if name in (".", "..") or os.path.basename(name) != name or "/" in name or "\\" in name:
        raise HostError(code, "Tên " + what + " không được chứa đường dẫn.")
    if allowed_extensions is not None and os.path.splitext(name)[1].lower() not in allowed_extensions:
        raise HostError(code, "Đuôi file video không được hỗ trợ: " + name)
    return name


def _optional_folder_name(value):
    """Tên thư mục con hoặc chuỗi rỗng (nghĩa là lưu/mở ngay thư mục gốc)."""
    if value is None:
        return ""
    if not isinstance(value, str):
        raise HostError("folder_name_invalid", "Tên thư mục con không hợp lệ.")
    if not value.strip():
        return ""
    return _safe_child_name(value, "folder_name_invalid", "thư mục con")


def open_saved_video(app_path_value, root_path_value, folder_name_value, file_name_value, root_token_value):
    """Mở một video vừa được extension ghi vào <root>/<folder>/<file> hoặc <root>/<file>.

    Không nhận sẵn một đường dẫn do extension tự ghép: kiểm tra từng phần,
    dùng commonpath với đường dẫn thật, rồi mới gọi open_video(). Điều này vừa
    ngăn ../ thoát thư mục gốc vừa cho lỗi rõ ràng khi hai thư mục gốc cùng tên
    nhưng nằm ở hai ổ khác nhau.
    """
    root_path = _clean_path(root_path_value, "root_path_missing", "root_path_invalid", "thư mục gốc")
    if not os.path.isdir(root_path):
        raise HostError("root_path_not_found", "Không tìm thấy thư mục gốc: " + root_path)
    if not _valid_root_token(root_token_value):
        raise HostError("root_token_invalid", "Mã xác nhận thư mục gốc không hợp lệ. Hãy chọn lại thư mục trong cài đặt.")
    if not secrets.compare_digest(_read_root_marker(root_path), root_token_value):
        raise HostError(
            "root_token_mismatch",
            "Thư mục Chrome đang dùng không khớp thư mục đã chọn cho app sửa video. Hãy chọn lại cùng một thư mục ở cả hai nơi.",
        )
    folder_name = _optional_folder_name(folder_name_value)
    file_name = _safe_child_name(file_name_value, "file_name_invalid", "file video", VIDEO_EXTENSIONS)
    real_root = os.path.realpath(root_path)
    video_path = os.path.realpath(os.path.join(real_root, folder_name, file_name) if folder_name else os.path.join(real_root, file_name))
    try:
        inside_root = os.path.commonpath([real_root, video_path]) == real_root
    except ValueError:
        inside_root = False
    if not inside_root:
        raise HostError("video_path_invalid", "File video không nằm trong thư mục gốc đã chọn.")
    return open_video(app_path_value, video_path, root_path=real_root, folder_name=folder_name)


def open_folder(root_path_value, root_token_value):
    """Mở thư mục gốc đã chọn trong "Video đã chọn" bằng Explorer.

    Cùng cách kiểm tra như open_saved_video: đường dẫn phải là thư mục có thật và
    marker .tvt trong đó phải chứa đúng mã extension gửi, để extension chỉ mở được
    thư mục mà nó đã xác nhận là thư mục Chrome đang giữ handle.
    """
    if not _is_windows():
        raise HostError("unsupported_os", "Chỉ hỗ trợ mở thư mục trên Windows.")
    root_path = _clean_path(root_path_value, "root_path_missing", "root_path_invalid", "thư mục")
    if not os.path.isdir(root_path):
        raise HostError("root_path_not_found", "Không tìm thấy thư mục: " + root_path)
    if not _valid_root_token(root_token_value):
        raise HostError("root_token_invalid", "Mã xác nhận thư mục không hợp lệ. Hãy chọn lại thư mục trong Video đã chọn.")
    if not secrets.compare_digest(_read_root_marker(root_path), root_token_value):
        raise HostError(
            "root_token_mismatch",
            "Thư mục Chrome đang dùng không khớp đường dẫn đã lưu. Hãy chọn lại thư mục trong Video đã chọn.",
        )
    real_root = os.path.realpath(root_path)
    try:
        os.startfile(real_root)  # ShellExecute: mở bằng Explorer, không đợi, không hiện console
    except OSError as exc:
        log("open_folder_failed: " + repr(exc))
        raise HostError("launch_failed", "Không mở được thư mục: " + real_root)
    return {"ok": True, "action": "open_folder", "path": real_root}


def _fixed_drive_roots():
    """Gốc các ổ cố định và ổ USB trên Windows ("C:\\", "D:\\"...). Ổ mạng và ổ đĩa
    quang bị bỏ qua vì dễ làm việc quét bị treo."""
    if not _is_windows():
        return []
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        mask = kernel32.GetLogicalDrives()
        roots = []
        for i in range(26):
            if mask & (1 << i):
                root = chr(65 + i) + ":\\"
                if kernel32.GetDriveTypeW(root) in (DRIVE_REMOVABLE, DRIVE_FIXED):
                    roots.append(root)
        return roots
    except Exception as exc:
        log("drive_list_failed: " + repr(exc))
        return []


def _profile_search_roots():
    """Các thư mục người dùng hay để video, quét trước cả ổ đĩa."""
    home = os.path.expanduser("~")
    candidates = [os.path.join(home, name) for name in ("Desktop", "Documents", "Downloads", "Videos", "Pictures")]
    one_drive = os.environ.get("OneDrive")
    if one_drive:
        candidates.append(one_drive)
    candidates.append(home)
    return [path for path in candidates if os.path.isdir(path)]


def locate_folder(folder_name_value, token_value, hints=None, seconds=None, roots=None):
    """Tìm đường dẫn thật của thư mục có file marker .tvt chứa đúng token_value.

    Chrome chỉ trả cho extension TÊN thư mục người dùng chọn trong "Video đã chọn".
    Extension ghi marker mới (token ngẫu nhiên) vào thư mục đó, host tìm lại thư mục
    ấy theo tên + token. Token vừa tạo nên không thể trùng với thư mục khác, kể cả
    thư mục cùng tên hoặc bản sao. Tìm theo từng lớp (rộng dần) nên thư mục nông được
    thấy ngay; dừng khi hết thời gian. roots chỉ dùng khi chạy thử.
    """
    folder_name = _safe_child_name(folder_name_value, "folder_name_invalid", "thư mục")
    if not _valid_root_token(token_value):
        raise HostError("root_token_invalid", "Mã xác nhận thư mục không hợp lệ.")
    target = folder_name.casefold()
    try:
        budget = float(seconds)
    except (TypeError, ValueError):
        budget = LOCATE_DEFAULT_SECONDS
    budget = max(1.0, min(budget, float(LOCATE_MAX_SECONDS)))
    started = time.monotonic()
    deadline = started + budget

    def is_target(path):
        try:
            if os.path.basename(path.rstrip("\\/")).casefold() != target or not os.path.isdir(path):
                return False
            return secrets.compare_digest(_read_root_marker(path), token_value)
        except (OSError, ValueError):
            return False

    def found(path):
        path = os.path.normpath(path)
        log("locate_folder found %r in %.1fs" % (path, time.monotonic() - started))
        return {
            "ok": True, "action": "locate_folder", "found": True,
            "path": path, "name": os.path.basename(path.rstrip("\\/")),
        }

    # 1) Gợi ý của extension: chính nó, thư mục con cùng tên, thư mục anh em cùng tên.
    for hint in (hints if isinstance(hints, list) else [])[:LOCATE_MAX_HINTS]:
        if not isinstance(hint, str) or not hint.strip() or len(hint) > MAX_TEXT_LEN:
            continue
        base = os.path.normpath(hint.strip().strip('"'))
        if not os.path.isabs(base):
            continue
        for candidate in (base, os.path.join(base, folder_name), os.path.join(os.path.dirname(base), folder_name)):
            if is_target(candidate):
                return found(candidate)

    # 2) Quét theo từng lớp thư mục.
    if roots is None:
        roots = _profile_search_roots() + _fixed_drive_roots()
    queue = collections.deque((root, 0) for root in roots)
    visited = set()
    scanned = 0
    while queue:
        if time.monotonic() > deadline:
            log("locate_folder timeout after %d dirs" % scanned)
            return {"ok": True, "action": "locate_folder", "found": False, "reason": "timeout", "scanned": scanned}
        path, depth = queue.popleft()
        key = os.path.normcase(path)
        if key in visited:
            continue
        visited.add(key)
        if depth == 0 and is_target(path):
            return found(path)
        scanned += 1
        try:
            with os.scandir(path) as entries:
                for entry in entries:
                    try:
                        if not entry.is_dir(follow_symlinks=False):
                            continue
                    except OSError:
                        continue
                    name = entry.name
                    if name.casefold() == target and is_target(entry.path):
                        return found(entry.path)
                    if depth < LOCATE_MAX_DEPTH and name.casefold() not in LOCATE_SKIP_DIRS and not name.startswith("$"):
                        queue.append((entry.path, depth + 1))
        except OSError:
            continue
    log("locate_folder not found after %d dirs" % scanned)
    return {"ok": True, "action": "locate_folder", "found": False, "reason": "not_found", "scanned": scanned}


def _child_env():
    """Môi trường cho tiến trình con. Bản .exe (PyInstaller onefile) phải đặt
    PYINSTALLER_RESET_ENVIRONMENT=1: nếu app con cũng là .exe PyInstaller thì nó sẽ
    tự giải nén riêng, không dùng chung thư mục tạm của host (thư mục này bị xóa khi
    host thoát). Bản Python trả None = kế thừa nguyên môi trường như trước đây."""
    if not FROZEN:
        return None
    env = dict(os.environ)
    env["PYINSTALLER_RESET_ENVIRONMENT"] = "1"
    return env


def _show_app_console():
    """True nếu người dùng đặt TIKVT_SHOW_CONSOLE=1: mở app .py trong cửa sổ PowerShell
    như bản cũ (để xem lỗi trực tiếp). Mặc định False: chạy ẩn."""
    return os.environ.get("TIKVT_SHOW_CONSOLE", "").strip() == "1"


def _app_log_path():
    return os.path.join(os.path.dirname(_log_path()), "editor_app.log")


def _python_for_app():
    """Chọn Python để chạy app .py. Bản Python dùng chính trình đang chạy host; bản .exe
    (sys.executable là host .exe, không phải Python) dò `py` rồi `python` trong PATH, giống
    script PowerShell cũ. Dùng python.exe (không phải pythonw.exe) để các lệnh con của app
    (ffmpeg, ...) kế thừa console ẩn thay vì tự bật cửa sổ đen riêng."""
    if not FROZEN and sys.executable and os.path.isfile(sys.executable):
        return sys.executable
    return shutil.which("py") or shutil.which("python") or ""


def _open_app_hidden(app_path, app_dir, video_path, root_path, folder_name):
    """Mở app .py không hiện cửa sổ console (CREATE_NO_WINDOW). Trả về Popen."""
    python_exe = _python_for_app()
    if not python_exe:
        raise HostError("launch_failed", "Không tìm thấy Python (py hoặc python) trong PATH để chạy app .py.")
    cmd = [python_exe, app_path, "--from-main-app", "--open-video", video_path]
    if root_path:
        cmd.extend(["--open-root", root_path])
    if folder_name:
        cmd.extend(["--open-folder", folder_name])
    env = dict(_child_env() or os.environ)
    # stdout đã chuyển sang file nên Python ghi theo bảng mã ANSI: chữ Việt app in ra có thể
    # gây UnicodeEncodeError (trước đây console hiển thị được). Ép UTF-8, không đệm để log đủ.
    env.setdefault("PYTHONIOENCODING", "utf-8:replace")
    env.setdefault("PYTHONUNBUFFERED", "1")
    log_stream = None
    try:
        path = _app_log_path()
        os.makedirs(os.path.dirname(path), exist_ok=True)
        try:
            if os.path.getsize(path) > 256 * 1024:
                os.replace(path, path + ".1")
        except OSError:
            pass
        log_stream = open(path, "ab")
        header = "\n--- %s mở app: %s\n" % (time.strftime("%Y-%m-%d %H:%M:%S"), video_path)
        log_stream.write(header.encode("utf-8"))
        log_stream.flush()
    except OSError as exc:
        log("không mở được editor_app.log, bỏ ghi log của app: " + repr(exc))
        log_stream = None
    flags = CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP
    try:
        if log_stream is None:
            return _spawn(cmd, app_dir, flags, env, discard_streams=True)
        return _spawn(cmd, app_dir, flags, env, log_stream=log_stream)
    finally:
        if log_stream is not None:
            log_stream.close()


def open_video(app_path_value, video_path_value, root_path="", folder_name=""):
    """Mở app sửa video với 1 video. Trả về dict kết quả (ok=True) hoặc ném HostError."""
    if not _is_windows():
        raise HostError("unsupported_os", "Cầu nối này chỉ chạy trên Windows.")
    app_path, kind = _check_app(app_path_value)
    video_path = _check_video(video_path_value)
    app_dir = os.path.dirname(app_path)
    try:
        if kind == "exe":
            cmd = [app_path, "--from-main-app", "--open-video", video_path]
            if root_path:
                cmd.extend(["--open-root", root_path])
            if folder_name:
                cmd.extend(["--open-folder", folder_name])
            proc = _spawn(cmd, app_dir, DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP, _child_env(), discard_streams=True)
        elif not _show_app_console():
            proc = _open_app_hidden(app_path, app_dir, video_path, root_path, folder_name)
        else:
            env = dict(os.environ)
            env["TIKVT_APP_DIR"] = app_dir
            env["TIKVT_PY_FILE"] = app_path
            env["TIKVT_VIDEO"] = video_path
            # Bản .exe: sys.executable là chính host .exe chứ không phải Python. Để trống
            # thì script PowerShell tự dò `py` rồi `python` trong PATH.
            env["TIKVT_PYTHON_EXE"] = "" if FROZEN else sys.executable
            if FROZEN:
                env["PYINSTALLER_RESET_ENVIRONMENT"] = "1"
            env["TIKVT_ROOT"] = root_path or ""
            env["TIKVT_FOLDER"] = folder_name or ""
            proc = _spawn(_powershell_command(), app_dir, CREATE_NEW_CONSOLE | CREATE_NEW_PROCESS_GROUP, env)
    except OSError as exc:
        log("launch_failed: " + repr(exc))
        raise HostError("launch_failed", "Không mở được app: " + str(exc))
    log("open_video mode=%s pid=%s app=%s video=%s" % (kind, proc.pid, app_path, video_path))
    return {"ok": True, "action": "open_video", "mode": kind, "pid": proc.pid}


def handle_request(req):
    if not isinstance(req, dict):
        return _fail("bad_request", "Tin nhắn không hợp lệ (cần là 1 object JSON).")
    action = req.get("action")
    try:
        if action == "ping":
            resp = {
                "ok": True, "action": "ping", "host": HOST_NAME, "version": HOST_VERSION,
                "platform": sys.platform, "python": sys.version.split()[0],
            }
        elif action == "check_app":
            app_path, kind = _check_app(req.get("appPath"))
            resp = {"ok": True, "action": "check_app", "kind": kind, "appPath": app_path}
        elif action == "choose_folder":
            resp = choose_folder(req.get("initialPath"))
        elif action == "choose_app_file":
            resp = choose_app_file()
        elif action == "open_video":
            resp = open_video(req.get("appPath"), req.get("videoPath"))
        elif action == "open_saved_video":
            resp = open_saved_video(
                req.get("appPath"),
                req.get("rootPath"),
                req.get("folderName"),
                req.get("fileName"),
                req.get("rootToken"),
            )
        elif action == "open_folder":
            resp = open_folder(req.get("rootPath"), req.get("rootToken"))
        elif action == "locate_folder":
            resp = locate_folder(
                req.get("folderName"),
                req.get("rootToken"),
                req.get("hints"),
                req.get("seconds"),
            )
        else:
            resp = _fail("unknown_action", "Không hỗ trợ action: " + repr(action))
    except HostError as exc:
        log("%s: %s" % (exc.code, exc.message))
        resp = _fail(exc.code, exc.message)
    except Exception as exc:  # không để host sập im lặng: báo lỗi về cho extension
        log(traceback.format_exc())
        resp = _fail("internal_error", "Lỗi không mong đợi trong host: " + str(exc))
    if "id" in req:
        resp["id"] = req["id"]
    return resp


def run_host(stdin=None, stdout=None):
    """Vòng lặp host: đọc từng tin nhắn, trả lời, dừng khi Chrome đóng kênh."""
    if stdin is None or stdout is None:
        stdin, stdout = sys.stdin.buffer, sys.stdout.buffer
        sys.stdout = sys.stderr  # print() vô tình cũng không phá được kênh trả lời
        if _is_windows():
            import msvcrt
            msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
            msvcrt.setmode(1, os.O_BINARY)
    log("host start, args=%r" % (sys.argv[1:],))
    while True:
        try:
            req = read_message(stdin)
        except Exception:
            log("đọc tin nhắn lỗi:\n" + traceback.format_exc())
            break
        if req is None:
            break
        try:
            write_message(stdout, handle_request(req))
        except (BrokenPipeError, OSError):
            log("Chrome đã đóng kênh trước khi nhận câu trả lời")
            break
    log("host stop")
    return 0


# --------------------------------------------------------------------------
# Cài đặt / gỡ cài đặt (HKCU, không cần quyền admin)
# --------------------------------------------------------------------------

def _parse_extension_ids(values):
    """Lấy ID extension (32 ký tự a-p) từ danh sách chuỗi; chấp nhận cả dạng dán
    nguyên "chrome-extension://<id>/". Trả về (ids, token_không_hợp_lệ)."""
    ids, bad = [], []
    for raw in values:
        for token in re.split(r"[\s,;]+", str(raw).strip()):
            if not token:
                continue
            match = re.fullmatch(r"(?:chrome-extension://)?([a-p]{32})/?", token)
            if not match:
                bad.append(token)
            elif match.group(1) not in ids:
                ids.append(match.group(1))
    return ids, bad


def _manifest_path():
    return os.path.join(HERE, MANIFEST_FILE)


def _read_manifest():
    try:
        with open(_manifest_path(), "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def _manifest_extension_ids():
    origins = _read_manifest().get("allowed_origins")
    if not isinstance(origins, list):
        return []
    return _parse_extension_ids([o for o in origins if isinstance(o, str)])[0]


def _write_manifest(ids):
    """Ghi file khai báo; không ghi lại nếu nội dung đã đúng. Trả về True nếu có ghi."""
    manifest = {
        "name": HOST_NAME,
        "description": "Tik Video Toolkit - mở app sửa video với video vừa tải",
        # Đường dẫn tương đối so với thư mục chứa file khai báo này (Windows cho phép).
        "path": HOST_LAUNCHER,
        "type": "stdio",
        "allowed_origins": ["chrome-extension://%s/" % i for i in ids],
    }
    content = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").replace("\n", "\r\n").encode("utf-8")
    try:
        with open(_manifest_path(), "rb") as f:
            if f.read() == content:
                return False
    except OSError:
        pass
    with open(_manifest_path(), "wb") as f:
        f.write(content)
    return True


# --------------------------------------------------------------------------
# Tự dò ID extension trong các profile của Chrome
# --------------------------------------------------------------------------
# Extension nạp từ file zip (Tải tiện ích đã giải nén) có ID phụ thuộc đường dẫn thư
# mục nên mỗi máy một khác. Chrome ghi mọi extension của profile vào file
# "Secure Preferences" / "Preferences" (extensions.settings.<ID>); với extension nạp
# từ thư mục thì có "path" trỏ tới thư mục đó. Đọc ra, mở manifest.json ở đó để chắc
# đúng là extension này.

def _chrome_user_data_dirs():
    base = os.environ.get("LOCALAPPDATA")
    return [os.path.join(base, "Google", "Chrome", "User Data")] if base else []


def _load_json(path):
    try:
        with open(path, "r", encoding="utf-8-sig") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else None
    except (OSError, ValueError):
        return None


def _is_our_manifest(manifest):
    if not isinstance(manifest, dict) or manifest.get("name") != EXTENSION_NAME:
        return False
    perms = manifest.get("host_permissions")
    return isinstance(perms, list) and any(isinstance(p, str) and EXTENSION_HOST_MARKER in p for p in perms)


def _entry_is_ours(entry, profile_dir):
    if _is_our_manifest(entry.get("manifest")):  # Chrome có thể lưu sẵn bản sao manifest
        return True
    path = entry.get("path")
    if not isinstance(path, str) or not path:
        return False
    if not os.path.isabs(path):  # extension cài từ Web Store: path tính từ <profile>\Extensions
        path = os.path.join(profile_dir, "Extensions", path)
    return _is_our_manifest(_load_json(os.path.join(path, "manifest.json")))


def _extension_settings(prefs):
    node = prefs
    for key in ("extensions", "settings"):
        node = node.get(key) if isinstance(node, dict) else None
    return node if isinstance(node, dict) else {}


def detect_extensions(user_data_dirs=None):
    """Liệt kê extension Tik Video Toolkit đang có trong các profile Chrome:
    [{"id": ..., "profile": "Default", "path": <thư mục extension>}], mỗi ID một lần."""
    if user_data_dirs is None:
        user_data_dirs = _chrome_user_data_dirs()
    found = {}
    for root in user_data_dirs:
        try:
            profiles = sorted(os.listdir(root))
        except OSError:
            continue
        for profile in profiles:
            profile_dir = os.path.join(root, profile)
            if not os.path.isdir(profile_dir):
                continue
            for prefs_name in ("Secure Preferences", "Preferences"):
                prefs = _load_json(os.path.join(profile_dir, prefs_name))
                for ext_id, entry in _extension_settings(prefs).items():
                    if ext_id in found or not isinstance(entry, dict) or not re.fullmatch(r"[a-p]{32}", str(ext_id)):
                        continue
                    if _entry_is_ours(entry, profile_dir):
                        found[ext_id] = {"id": ext_id, "profile": profile, "path": entry.get("path")}
    return list(found.values())


def install(values):
    if not _is_windows():
        print("Chỉ cài được trên Windows.")
        return 1
    ids, bad = _parse_extension_ids(values)
    if bad:
        print("ID extension không hợp lệ (cần đúng 32 chữ cái a-p): " + ", ".join(bad))
        return 2
    if not ids:
        detected = detect_extensions()
        ids = [d["id"] for d in detected]
        if ids:
            print("Đã tự tìm thấy extension " + EXTENSION_NAME + " trong Chrome:")
            for d in detected:
                print("  %s  (profile %s)" % (d["id"], d["profile"]))
        # Dò không ra thì KHÔNG lấy lại ID trong file .json: file đó có thể được gửi kèm từ máy
        # khác (ID khác), khi đó cài xong vẫn báo thành công mà Chrome từ chối host. Hỏi người dùng.
    if not ids:
        print("Không tìm thấy extension " + EXTENSION_NAME + " trong Chrome.")
        print("- Nạp extension trước: chrome://extensions > bật 'Chế độ nhà phát triển' >")
        print("  'Tải tiện ích đã giải nén'. Nếu vừa nạp xong, đợi vài giây (Chrome ghi file")
        print("  hơi chậm) rồi chạy lại.")
        print("- Nếu vẫn không được (ví dụ Chrome chạy với thư mục dữ liệu riêng), copy ID ở")
        print("  chrome://extensions rồi chạy:  " + ("tik_native_host.exe" if FROZEN else "py tik_native_host.py") + " --install <ID>")
        return 2
    if not os.path.isfile(os.path.join(HERE, HOST_LAUNCHER)):
        print("Không thấy " + HOST_LAUNCHER + " cạnh file này - hãy giữ nguyên cả thư mục native_host.")
        return 3
    import winreg
    changed = _write_manifest(ids)
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, REGISTRY_SUBKEY) as key:
        winreg.SetValueEx(key, "", 0, winreg.REG_SZ, _manifest_path())
    print("Đã cài xong.")
    print("  Registry : HKCU\\" + REGISTRY_SUBKEY)
    print("  Khai báo : " + _manifest_path() + ("" if changed else "  (không đổi)"))
    print("  Extension: " + ", ".join(ids))
    print("Nếu đổi chỗ để thư mục native_host thì chạy lại --install.")
    return 0


def uninstall():
    if not _is_windows():
        print("Chỉ gỡ được trên Windows.")
        return 1
    import winreg
    try:
        winreg.DeleteKey(winreg.HKEY_CURRENT_USER, REGISTRY_SUBKEY)
        print("Đã xóa khóa registry HKCU\\" + REGISTRY_SUBKEY)
    except FileNotFoundError:
        print("Khóa registry chưa có, không cần gỡ.")
    print("File khai báo và thư mục này được giữ nguyên - xóa tay nếu không dùng nữa.")
    return 0


def status():
    print("Host        : " + HOST_NAME + " (version %d)" % HOST_VERSION)
    print("Thư mục     : " + HERE)
    print("Chế độ      : " + (".exe (không cần Python)" if FROZEN else "Python (máy cần cài Python)"))
    print("Wrapper     : " + ("có" if os.path.isfile(os.path.join(HERE, HOST_LAUNCHER)) else "THIẾU") + " " + HOST_LAUNCHER)
    chrome_runs = _read_manifest().get("path")
    print("Chrome chạy : " + (str(chrome_runs) if chrome_runs else "(chưa có file khai báo)")
          + ("" if not chrome_runs or chrome_runs == HOST_LAUNCHER else "  <-- khác chế độ này, chạy lại --install nếu muốn đổi"))
    ids = _manifest_extension_ids()
    print("Extension ID: " + (", ".join(ids) if ids else "(chưa cài - file khai báo còn ID mẫu)"))
    detected = [d["id"] for d in detect_extensions()]
    print("Dò trong Chrome: " + (", ".join(detected) if detected else "(không thấy extension " + EXTENSION_NAME + ")"))
    if detected and set(detected) != set(ids):
        print("                 <-- KHÁC file khai báo, chạy lại --install (hoặc install_native_host.bat)")
    if _is_windows():
        import winreg
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, REGISTRY_SUBKEY) as key:
                value = winreg.QueryValueEx(key, "")[0]
            same = os.path.normcase(os.path.abspath(value)) == os.path.normcase(_manifest_path())
            print("Registry    : " + value + ("" if same else "  <-- KHÁC thư mục này, chạy lại --install"))
            print("File khai báo: " + ("có" if os.path.isfile(value) else "THIẾU"))
        except FileNotFoundError:
            print("Registry    : CHƯA cài (chạy install_native_host.bat)")
    print("Log         : " + _log_path())
    return 0


# --------------------------------------------------------------------------
# Công cụ thử, không cần extension
# --------------------------------------------------------------------------

def open_test(app_path, video_path):
    resp = handle_request({"action": "open_video", "appPath": app_path, "videoPath": video_path})
    print(json.dumps(resp, ensure_ascii=False, indent=2))
    return 0 if resp.get("ok") else 1


def simulate_chrome(payload=None, host_cmd=None, timeout=20):
    """Chạy host y như Chrome: qua tik_native_host.bat (bản .exe: chính file .exe), truyền origin giả làm
    tham số đầu, gửi 1 tin nhắn có khung 4 byte, đọc câu trả lời rồi đóng kênh."""
    if host_cmd is None:
        ids = _manifest_extension_ids()
        origin = "chrome-extension://%s/" % (ids[0] if ids else "a" * 32)
        host_cmd = [os.path.join(HERE, HOST_LAUNCHER), origin]
    message = payload if payload is not None else {"action": "ping"}
    data = json.dumps(message, ensure_ascii=False).encode("utf-8")
    proc = subprocess.Popen(
        host_cmd, cwd=HERE, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    try:
        out, err = proc.communicate(struct.pack("=I", len(data)) + data, timeout=timeout)
    except subprocess.TimeoutExpired:
        proc.kill()
        out, err = proc.communicate()
        print("Host không thoát sau %d giây." % timeout)
    if err:
        print("stderr của host:\n" + err.decode("utf-8", "replace"))
    if len(out) < 4:
        print("Host không trả lời gì (stdout rỗng). Mã thoát: %s" % proc.returncode)
        return 1
    (length,) = struct.unpack("=I", out[:4])
    body = out[4:4 + length]
    if len(body) < length:
        print("Câu trả lời bị cụt: cần %d byte, nhận %d byte." % (length, len(body)))
        return 1
    print(json.dumps(json.loads(body.decode("utf-8")), ensure_ascii=False, indent=2))
    return 0


def main(argv):
    command = argv[1] if len(argv) > 1 else ""
    if FROZEN and not command and sys.stdin is not None and sys.stdin.isatty():
        # Bấm đúp vào .exe: host do Chrome gọi, người dùng không chạy tay.
        print("Đây là file cầu nối để Chrome gọi, không chạy bằng cách bấm đúp.")
        print("Muốn cài đặt: chạy install_native_host_exe.bat (xem hướng dẫn sử dụng.txt).")
        try:
            input("Nhấn Enter để đóng cửa sổ này...")
        except EOFError:
            pass
        return 0
    if command == "--install":
        return install(argv[2:])
    if command == "--detect":
        found = detect_extensions()
        for d in found:
            print("%s  profile=%s  path=%s" % (d["id"], d["profile"], d["path"] or "(Web Store)"))
        if not found:
            print("Không thấy extension " + EXTENSION_NAME + " trong Chrome (" + "; ".join(_chrome_user_data_dirs()) + ").")
        return 0 if found else 1
    if command == "--uninstall":
        return uninstall()
    if command == "--status":
        return status()
    if command == "--open-test":
        if len(argv) != 4:
            print('Cách dùng: py tik_native_host.py --open-test "<app .exe/.py>" "<video>"')
            return 2
        return open_test(argv[2], argv[3])
    if command == "--simulate-chrome":
        payload = None
        if len(argv) > 2:
            try:
                payload = json.loads(argv[2])
            except ValueError as exc:
                print("JSON không hợp lệ: " + str(exc))
                return 2
        return simulate_chrome(payload)
    # Chrome gọi với tham số đầu là origin ("chrome-extension://<id>/"), trên Windows
    # có thêm --parent-window=<handle>: bỏ qua hết, vào thẳng chế độ host.
    return run_host()


if __name__ == "__main__":
    sys.exit(main(sys.argv))
