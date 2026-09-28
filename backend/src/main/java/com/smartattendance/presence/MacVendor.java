package com.smartattendance.presence;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/** Lightweight OUI → vendor hint for admin approval queue. */
public final class MacVendor {

    private static final Map<String, String> OUI = new LinkedHashMap<>();

    static {
        OUI.put("AA:BB:CC", "Demo Classroom Device");
        OUI.put("00:1A:79", "Apple");
        OUI.put("00:1B:63", "Apple");
        OUI.put("3C:06:30", "Apple");
        OUI.put("F0:18:98", "Apple");
        OUI.put("AC:DE:48", "Apple");
        OUI.put("A4:83:E7", "Apple");
        OUI.put("DC:A9:04", "Apple");
        OUI.put("28:6A:BA", "Apple");
        OUI.put("00:50:56", "VMware");
        OUI.put("00:0C:29", "VMware");
        OUI.put("00:1C:42", "Parallels");
        OUI.put("B8:27:EB", "Raspberry Pi");
        OUI.put("DC:A6:32", "Raspberry Pi");
        OUI.put("E4:5F:01", "Raspberry Pi");
        OUI.put("00:1A:11", "Google");
        OUI.put("F4:F5:D8", "Google");
        OUI.put("3C:5A:B4", "Google");
        OUI.put("00:E0:4C", "Realtek");
        OUI.put("00:1E:10", "Huawei");
        OUI.put("00:25:9E", "Huawei");
        OUI.put("FC:FB:FB", "Samsung");
        OUI.put("00:16:6B", "Samsung");
        OUI.put("00:26:37", "Samsung");
        OUI.put("00:21:6A", "Intel");
        OUI.put("00:1F:3B", "Intel");
        OUI.put("00:1B:21", "Intel");
        OUI.put("00:14:22", "Dell");
        OUI.put("00:21:70", "Dell");
        OUI.put("00:1A:A0", "Dell");
        OUI.put("00:15:5D", "Microsoft Hyper-V");
        OUI.put("F8:E4:3B", "Xiaomi");
        OUI.put("64:B4:73", "Xiaomi");
        OUI.put("A0:9E:1A", "OnePlus");
        OUI.put("C0:EE:FB", "OnePlus");
    }

    private MacVendor() {}

    public static String lookup(String mac) {
        if (mac == null || mac.length() < 8) {
            return "Unknown";
        }
        String normalized = mac.trim().toUpperCase(Locale.ROOT).replace('-', ':');
        String[] p = normalized.split(":");
        if (p.length < 3) {
            return "Unknown";
        }
        String prefix = p[0] + ":" + p[1] + ":" + p[2];
        return OUI.getOrDefault(prefix, "Unknown vendor");
    }
}
