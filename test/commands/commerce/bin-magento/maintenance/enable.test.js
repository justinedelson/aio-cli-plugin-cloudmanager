/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { init, mockSdk } = require('@adobe/aio-lib-cloudmanager')
const { resetCurrentOrgId, setCurrentOrgId } = require('@adobe/aio-lib-ims')
const MaintenanceEnableCommand = require('../../../../../src/commands/cloudmanager/commerce/bin-magento/maintenance/enable')

beforeEach(() => {
  resetCurrentOrgId()
})

test('maintenance:enable - missing arg', async () => {
  expect.assertions(2)

  const runResult = MaintenanceEnableCommand.run([])
  await expect(runResult instanceof Promise).toBeTruthy()
  await expect(runResult).rejects.toThrow(/^Missing 1 required arg/)
})

test('maintenance:enable - missing config', async () => {
  expect.assertions(2)

  const runResult = MaintenanceEnableCommand.run(['--programId', '5', '10'])
  await expect(runResult instanceof Promise).toBeTruthy()
  await expect(runResult).rejects.toThrow('[CloudManagerCLI:NO_IMS_CONTEXT] Unable to find IMS context aio-cli-plugin-cloudmanager.')
})

test('maintenance:enable', async () => {
  let counter = 0
  setCurrentOrgId('good')
  mockSdk.postCommerceCommandExecution = jest.fn(() =>
    Promise.resolve({
      id: '5000',
    }),
  )
  mockSdk.getCommerceCommandExecution = jest.fn(() => {
    counter++
    if (counter === 1) {
      return Promise.resolve({
        status: 'PENDING',
        message: 'running maintenance enable',
      })
    } else if (counter < 3) {
      return Promise.resolve({
        status: 'RUNNING',
        message: 'running maintenance enable',
      })
    }
    return Promise.resolve({
      status: 'COMPLETE',
      message: 'maintenance enabled',
    })
  })

  expect.assertions(7)

  const runResult = MaintenanceEnableCommand.run(['--programId', '5', '10'])
  await expect(runResult instanceof Promise).toBeTruthy()
  await runResult
  await expect(init.mock.calls.length).toEqual(1)
  await expect(init).toHaveBeenCalledWith(
    'good',
    'test-client-id',
    'fake-token',
    'https://cloudmanager.adobe.io',
  )
  await expect(mockSdk.postCommerceCommandExecution.mock.calls.length).toEqual(1)
  await expect(mockSdk.postCommerceCommandExecution).toHaveBeenCalledWith('5', '10', {
    type: 'bin/magento',
    command: 'maintenance:enable',
  })
  await expect(mockSdk.getCommerceCommandExecution).toHaveBeenCalledWith('5', '10', '5000')
  await expect(mockSdk.getCommerceCommandExecution).toHaveBeenCalledTimes(3)
})

test('maintenance:enable - api error', async () => {
  setCurrentOrgId('good')
  mockSdk.postCommerceCommandExecution = jest.fn(() =>
    Promise.reject(new Error('Command failed.')),
  )
  mockSdk.getCommerceCommandExecution = jest.fn()
  const runResult = MaintenanceEnableCommand.run(['--programId', '5', '10'])
  await expect(runResult instanceof Promise).toBeTruthy()
  await expect(runResult).rejects.toEqual(new Error('Command failed.'))
})