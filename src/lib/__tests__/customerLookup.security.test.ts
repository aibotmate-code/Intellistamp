/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import CustomerLookup from '@/components/business/CustomerLookup'

describe('CustomerLookup Security and Autofill Prevention', () => {
  let originalUseState: any

  beforeAll(() => {
    const reactAny = React as any
    originalUseState = reactAny.useState
    reactAny.useState = (init: any) => [typeof init === 'function' ? init() : init, jest.fn()] as any
  })

  afterAll(() => {
    const reactAny = React as any
    reactAny.useState = originalUseState
  })

  test('Customer mobile input starts empty, does not use merchant credentials, and has autofill protection', () => {
    const element = CustomerLookup({
      businessId: 'biz-123',
      stampsRequired: 8,
    })

    // 1. Find dummy inputs
    const dummyUser = element.props.children.find(
      (child: any) => child && child.type === 'input' && child.props.name === 'prevent_autofill_username'
    )
    const dummyPass = element.props.children.find(
      (child: any) => child && child.type === 'input' && child.props.name === 'prevent_autofill_password'
    )
    expect(dummyUser).toBeDefined()
    expect(dummyPass).toBeDefined()
    expect(dummyUser.props.style.display).toBe('none')
    expect(dummyPass.props.style.display).toBe('none')

    // 2. Find actual mobile input
    const mobileInput = element.props.children.find(
      (child: any) => child && child.props && child.props.name === 'customer-mobile-lookup'
    )
    expect(mobileInput).toBeDefined()
    expect(mobileInput.props.value).toBe('') // Must start empty
    expect(mobileInput.props.type).toBe('tel')
    expect(mobileInput.props.autoComplete).toBe('off')
    expect(mobileInput.props.inputMode).toBe('numeric')

    // 3. Find actual pin input
    const pinInput = element.props.children.find(
      (child: any) => child && child.props && child.props.name === 'staff-pin-verification'
    )
    expect(pinInput).toBeDefined()
    expect(pinInput.props.type).toBe('password')
    expect(pinInput.props.autoComplete).toBe('new-password')
  })
})
