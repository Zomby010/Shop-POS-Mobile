import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { View } from 'react-native';

import { Button, Muted, Screen, T } from '@/components/ui';
import { useScan } from '@/store/scan';

/** The phone camera as a barcode scanner. The code goes back to the screen that opened it. */
export default function Scan() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const done = useRef(false);

  if (!permission) return <Screen><Muted>Starting the camera…</Muted></Screen>;
  if (!permission.granted) {
    return (
      <Screen>
        <T size={17} weight="600">Shop POS needs the camera to scan barcodes.</T>
        <Button title="Allow the camera" onPress={() => void requestPermission()} />
      </Screen>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
        onBarcodeScanned={({ data }) => {
          if (done.current || !data) return;
          done.current = true;
          useScan.getState().put(data);
          router.back();
        }}
      />
      <View style={{ position: 'absolute', left: 0, right: 0, top: '42%', height: 2, backgroundColor: '#3fb07a' }} />
    </View>
  );
}
