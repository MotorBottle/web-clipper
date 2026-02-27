import { ServiceMeta } from '@/common/backend';
import Service from './service';
import Form from './form';

export default (): ServiceMeta => {
  return {
    name: 'Outline',
    icon: 'https://app.getoutline.com/favicon-32x32.png',
    type: 'outline',
    homePage: 'https://app.getoutline.com',
    service: Service,
    form: Form,
    permission: {
      origins: ['<all_urls>'],
    },
  };
};
