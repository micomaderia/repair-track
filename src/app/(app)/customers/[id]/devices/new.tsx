import { router, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/ui/layout';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { createDevice, deviceLabel, getCustomer } from '@/features/customers/api';
import { DeviceForm } from '@/features/customers/components/forms';
import { useResource } from '@/hooks/use-resource';

export default function NewDeviceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const customer = useResource(() => getCustomer(id), [id]);

  return (
    <Screen>
      <AppText variant="body" tone="secondary">
        {customer.data ? `Device owned by ${customer.data.full_name}` : ' '}
      </AppText>
      <DeviceForm
        submitLabel="Save device"
        onCancel={() => router.back()}
        onSubmit={async (values) => {
          const device = await createDevice(id, values);
          toast.show(`${deviceLabel(device)} added`);
          router.back();
        }}
      />
    </Screen>
  );
}
