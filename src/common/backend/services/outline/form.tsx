import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.less';
import { Input } from 'antd';
import React from 'react';
import { FormComponentProps } from '@ant-design/compatible/lib/form';
import { OutlineBackendServiceConfig } from './interface';
import { FormattedMessage } from 'react-intl';

interface OutlineFormProps extends FormComponentProps {
  info?: OutlineBackendServiceConfig;
}

const OutlineForm: React.FC<OutlineFormProps> = ({ form, info }) => {
  const { getFieldDecorator } = form;
  return (
    <React.Fragment>
      <Form.Item
        label={
          <FormattedMessage id="backend.services.outline.form.origin" defaultMessage="Base URL" />
        }
      >
        {getFieldDecorator('baseUrl', {
          initialValue: info?.baseUrl || 'https://app.getoutline.com',
          rules: [
            {
              required: true,
              message: 'Please input the Outline base URL.',
            },
          ],
        })(<Input placeholder="e.g. https://app.getoutline.com" />)}
      </Form.Item>
      <Form.Item
        label={
          <FormattedMessage id="backend.services.outline.form.apiKey" defaultMessage="API Key" />
        }
      >
        {getFieldDecorator('apiKey', {
          initialValue: info?.apiKey,
          rules: [
            {
              required: true,
              message: 'API key is required.',
            },
          ],
        })(<Input.Password placeholder="Starts with ol_api_" />)}
      </Form.Item>
    </React.Fragment>
  );
};

export default Form.create<OutlineFormProps>()(OutlineForm);
