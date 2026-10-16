package app.kap.store;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.IBinder;
import android.os.Parcel;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.OutputStream;
import java.util.Locale;
import java.util.UUID;

/**
 * Sends ESC/POS bytes to the terminal's own printer. Tried in order:
 *  1. the printer service most Android POS terminals ship (the "woyou" / InnerPrinter
 *     interface, used by Sunmi and many compatible devices), called with sendRAWData;
 *  2. the built-in printer exposed as a paired Bluetooth device (InnerPrinter, 00:11:22:33:44:55, "*printer*").
 * The way that worked is remembered so the next receipt goes straight there.
 */
class Printer {
    private static final String SVC_PKG = "woyou.aidlservice.jiuiv5";
    private static final String SVC_ACTION = "woyou.aidlservice.jiuiv5.IWoyouService";
    private static final String SVC_DESC = "woyou.aidlservice.jiuiv5.IWoyouService";
    private static final int TX_SEND_RAW = 11; // 11th method of IWoyouService: sendRAWData(in byte[], in ICallback)
    private static final UUID SPP = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private final Context ctx;
    private volatile IBinder service;
    private String lastResult = "";
    private String lastWay = "";

    private final ServiceConnection conn = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder binder) {
            service = binder;
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            service = null;
        }
    };

    Printer(Context c) {
        ctx = c.getApplicationContext();
        bind();
    }

    private void bind() {
        try {
            Intent i = new Intent(SVC_ACTION);
            i.setPackage(SVC_PKG);
            ctx.bindService(i, conn, Context.BIND_AUTO_CREATE);
        } catch (Exception ignored) {
            // no printer service on this device
        }
    }

    void close() {
        try {
            ctx.unbindService(conn);
        } catch (Exception ignored) {
        }
    }

    synchronized String print(byte[] data) {
        StringBuilder err = new StringBuilder();
        if (service == null) {
            bind();
            for (int i = 0; i < 15 && service == null; i++) sleep(100);
        }
        if (service != null) {
            try {
                sendRaw(service, data);
                return done("service");
            } catch (Exception e) {
                err.append("service: ").append(e.getMessage()).append("; ");
            }
        }
        try {
            String bt = bluetooth(data);
            if (bt != null) return done(bt);
            err.append("bluetooth: no printer paired; ");
        } catch (Exception e) {
            err.append("bluetooth: ").append(e.getMessage()).append("; ");
        }
        lastResult = "error:" + err;
        return lastResult;
    }

    private String done(String way) {
        lastWay = way;
        lastResult = "ok:" + way;
        return lastResult;
    }

    private static void sendRaw(IBinder b, byte[] data) throws Exception {
        final int chunk = 16 * 1024; // well under the binder transaction limit
        for (int off = 0; off < data.length; off += chunk) {
            int len = Math.min(chunk, data.length - off);
            byte[] part = new byte[len];
            System.arraycopy(data, off, part, 0, len);
            Parcel in = Parcel.obtain();
            Parcel out = Parcel.obtain();
            try {
                in.writeInterfaceToken(SVC_DESC);
                in.writeByteArray(part);
                in.writeStrongBinder(null); // no callback
                if (!b.transact(TX_SEND_RAW, in, out, 0)) throw new Exception("transact refused");
                out.readException();
            } finally {
                in.recycle();
                out.recycle();
            }
        }
    }

    private boolean btAllowed() {
        return Build.VERSION.SDK_INT < 31
                || ctx.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
    }

    @SuppressWarnings("MissingPermission")
    private BluetoothDevice findPrinter(BluetoothAdapter a) {
        BluetoothDevice byName = null;
        for (BluetoothDevice d : a.getBondedDevices()) {
            String n = d.getName() == null ? "" : d.getName().toLowerCase(Locale.ROOT);
            if ("00:11:22:33:44:55".equals(d.getAddress()) || n.contains("innerprinter") || n.contains("inner printer")) return d;
            if (byName == null && (n.contains("print") || n.contains("pos"))) byName = d;
        }
        return byName;
    }

    @SuppressWarnings("MissingPermission")
    private String bluetooth(byte[] data) throws Exception {
        BluetoothAdapter a = BluetoothAdapter.getDefaultAdapter();
        if (a == null) return null;
        if (!btAllowed()) throw new Exception("permission not granted");
        if (!a.isEnabled()) throw new Exception("bluetooth is off");
        BluetoothDevice d = findPrinter(a);
        if (d == null) return null;
        try {
            a.cancelDiscovery(); // needs BLUETOOTH_SCAN on Android 12+; not needed for a paired printer
        } catch (Exception ignored) {
        }
        BluetoothSocket s = d.createRfcommSocketToServiceRecord(SPP);
        try {
            try {
                s.connect();
            } catch (Exception first) {
                try {
                    s.close();
                } catch (Exception ignored) {
                }
                s = d.createInsecureRfcommSocketToServiceRecord(SPP);
                s.connect();
            }
            OutputStream o = s.getOutputStream();
            for (int off = 0; off < data.length; off += 4096) {
                o.write(data, off, Math.min(4096, data.length - off));
                o.flush();
            }
            sleep(400);
        } finally {
            try {
                s.close();
            } catch (Exception ignored) {
            }
        }
        return "bluetooth:" + d.getName();
    }

    /** What this terminal offers — sent to KAP so printing can be supported on new models. */
    @SuppressWarnings("MissingPermission")
    String info() {
        JSONObject j = new JSONObject();
        try {
            j.put("app", "1");
            j.put("brand", Build.BRAND);
            j.put("manufacturer", Build.MANUFACTURER);
            j.put("model", Build.MODEL);
            j.put("device", Build.DEVICE);
            j.put("product", Build.PRODUCT);
            j.put("sdk", Build.VERSION.SDK_INT);
            j.put("printer_service", service != null);
            j.put("last_result", lastResult);
            j.put("last_way", lastWay);

            JSONArray bt = new JSONArray();
            BluetoothAdapter a = BluetoothAdapter.getDefaultAdapter();
            if (a != null && btAllowed()) {
                j.put("bluetooth_on", a.isEnabled());
                for (BluetoothDevice d : a.getBondedDevices()) bt.put(d.getName() + " " + d.getAddress());
            }
            j.put("bluetooth_paired", bt);

            JSONArray pk = new JSONArray();
            for (ApplicationInfo ai : ctx.getPackageManager().getInstalledApplications(0)) {
                String p = ai.packageName.toLowerCase(Locale.ROOT);
                if (p.contains("print") || p.contains("pos") || p.contains("woyou") || p.contains("hardware")
                        || p.contains("device") || p.contains("sdk") || p.contains("service")) {
                    if (!p.startsWith("com.android.") && !p.startsWith("com.google.") && !p.startsWith("android")) pk.put(ai.packageName);
                }
            }
            j.put("packages", pk);

            JSONArray tty = new JSONArray();
            File[] devs = new File("/dev").listFiles();
            if (devs != null) {
                for (File f : devs) {
                    String n = f.getName();
                    if (n.startsWith("ttyS") || n.startsWith("ttyMT") || n.startsWith("ttyHS") || n.startsWith("ttyUSB")
                            || n.startsWith("ttyGS") || n.startsWith("ttyACM") || n.contains("print")) {
                        tty.put(n + (f.canWrite() ? " w" : ""));
                    }
                }
            }
            j.put("serial", tty);
        } catch (Exception ignored) {
        }
        return j.toString();
    }

    private static void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ignored) {
        }
    }
}
