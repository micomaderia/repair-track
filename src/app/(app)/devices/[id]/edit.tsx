import { router, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/ui/layout';
import { ErrorState, ListSkeleton } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { getDevice, updateDevice } from '@/features/customers/api';
import { DeviceForm } from '@/features/customers/components/forms';
import { useResource } from '@/hooks/use-resource';

export default function EditDeviceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const device = useResource(() => getDevice(id), [id]);

  return (
    <Screen>
      {device.loading ? (
        <ListSkeleton rows={1} />
      ) : device.error || !device.data ? (
        device.error ? <ErrorState error={device.error} onRetry={device.reload} /> : null
      ) : (
        <>
          <AppText variant="caption" tone="tertiary">
            A device always stays with the customer who owns it, so its repair history is never mixed up.
          </AppText>
          <DeviceForm
            defaultValues={{
              deviceType: device.data.device_type,
              brand: device.data.brand,
              model: device.data.model,
              serialNumber: device.data.serial_number ?? '',
            }}
            submitLabel="Save changes"
            onCancel={() => router.back()}
            onSubmit={async (values) => {
              await updateDevice(id, values);
              toast.show('Device updated');
              router.back();
            }}
          />
        </>
      )}
    </Screen>
  );
}
