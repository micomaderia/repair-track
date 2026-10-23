import { router, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/ui/layout';
import { ErrorState, ListSkeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { getCustomer, updateCustomer } from '@/features/customers/api';
import { CustomerForm } from '@/features/customers/components/forms';
import { useResource } from '@/hooks/use-resource';

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const customer = useResource(() => getCustomer(id), [id]);

  return (
    <Screen>
      {customer.loading ? (
        <ListSkeleton rows={1} />
      ) : customer.error || !customer.data ? (
        customer.error ? <ErrorState error={customer.error} onRetry={customer.reload} /> : null
      ) : (
        <CustomerForm
          defaultValues={{
            fullName: customer.data.full_name,
            contactNumber: customer.data.contact_number,
            address: customer.data.address ?? '',
          }}
          submitLabel="Save changes"
          onCancel={() => router.back()}
          onSubmit={async (values) => {
            await updateCustomer(id, values);
            toast.show('Customer updated');
            router.back();
          }}
        />
      )}
    </Screen>
  );
}
