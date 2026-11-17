using System.IO;
using System.Text.Json;

namespace FTX1WinController.Settings;

/// Persists the handful of connection fields worth remembering between
/// launches (CAT-1/CAT-2 COM port) so the user doesn't have to retype them
/// every time — baud rates have a stable default and aren't worth the same
/// treatment. Plain JSON under %AppData%, not the WPF
/// Properties.Settings.settings designer file, to keep this simple and
/// hand-inspectable rather than relying on generated code that can't be
/// compiled/verified locally.
public sealed class AppSettings
{
    public string? Cat1Port { get; set; }
    public string? Cat2Port { get; set; }
    public string? AudioInputDeviceName { get; set; }

    /// SM (RF signal strength) and SQ (squelch threshold) are both 0-255
    /// CAT readings but not the same physical quantity — most Yaesu
    /// FM/AM squelch circuits gate on audio-noise energy, not raw RF
    /// signal strength, and the FTX-1 exposes no CAT command for the
    /// noise detector's actual state. So MONITOR's SM-vs-SQ approximation
    /// (MainViewModel.RefreshMetersAsync) can only ever be a rough match
    /// for the real speaker's squelch point, not an exact one — this trim
    /// (subtracted from SQ before the comparison) exists to be tuned on
    /// the bench against the real radio rather than guessed from source
    /// alone.
    ///
    /// Split HF-vs-VHF/UHF (2026-09-16) rather than one flat value —
    /// bench-confirmed the real SM/SQ offset is a front-end/AGC property
    /// that differs sharply by band, not one constant: -77 on 40m (HF, FM)
    /// but +23/+24 on 2m and 70cm. 6m measured like VHF/UHF (+23/24), not
    /// HF, despite being grouped with HF/50 everywhere else in this app
    /// (see RadioController.PreampBandForFrequency/MainViewModel's
    /// IsHfBand, both <60MHz) — that boundary is about which IPO/AMP
    /// option set and ANT SELECT behavior the hardware exposes, an
    /// unrelated property, so MONITOR trim uses its own <50MHz split
    /// (MainViewModel.MonitorSquelchTrimIsHfBand) rather than reusing it.
    ///
    /// HF further split by AM-vs-FM (2026-09-16): on HF, AM needs +80
    /// where FM needs -77 — a much bigger gap than band alone explains.
    /// VHF/UHF does NOT need the same split — AM and FM both measured
    /// ~23/24 there, so one shared value covers both (no VhfUhfAm field;
    /// proven unnecessary, not just unmeasured). Only 40m (HF) and 2m/70cm
    /// (VHF/UHF) have been independently bench-measured — other bands
    /// within each group are assumed similar, not yet confirmed.
    public int MonitorSquelchTrimHfFm { get; set; } = -77;
    public int MonitorSquelchTrimHfAm { get; set; } = 80;
    public int MonitorSquelchTrimVhfUhf { get; set; } = 24;

    public List<PresetData> Presets { get; set; } = new();

    private static string FilePath => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "FTX1WinController", "settings.json");

    public static AppSettings Load()
    {
        try
        {
            if (File.Exists(FilePath))
            {
                var json = File.ReadAllText(FilePath);
                var settings = JsonSerializer.Deserialize<AppSettings>(json);
                if (settings != null) return settings;
            }
        }
        catch
        {
            // Corrupt/unreadable settings file — fall back to defaults
            // rather than blocking startup.
        }
        return new AppSettings();
    }

    public void Save()
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(FilePath)!);
            File.WriteAllText(FilePath, JsonSerializer.Serialize(this));
        }
        catch
        {
            // Best-effort — a failed save shouldn't crash the app.
        }
    }
}
