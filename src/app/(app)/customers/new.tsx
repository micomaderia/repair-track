import { router } from 'expo-router';

import { Screen } from '@/components/ui/layout';
import { useToast } from '@/components/ui/toast';
import { createCustomer } from '@/features/customers/api';
import { CustomerForm } from '@/features/customers/components/forms';

export default function NewCustomerScreen() {
  const toast = useToast();
  return (
    <Screen>
      <CustomerForm
        submitLabel="Save customer"
        onSubmit={async (values) => {
          const customer = await createCustomer(values);
          toast.show(`${customer.full_name} added`);
          router.replace({ pathname: '/customers/[id]', params: { id: customer.id } });
        }}
      />
    </Screen>
  );
}
