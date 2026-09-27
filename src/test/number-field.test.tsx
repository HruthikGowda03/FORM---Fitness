/* ==========================================================================
   Numeric field editing
   ---------------------------------------------------------------------------
   The reported bug: height and weight could not be cleared. The fields were
   pre-filled (170 cm, 65 kg) and the handler was

       onChange={(v) => v !== undefined && set('heightCm', v)}

   so deleting the last digit produced `undefined`, the handler did nothing, and
   the controlled value snapped straight back. You could get down to one digit
   but never to empty, so the natural "clear it and type my own" was impossible.

   The fix is to let the input hold text while it is being edited and commit a
   number upward, instead of demanding a number on every keystroke. These tests
   pin the behaviours that were broken.
   ========================================================================== */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { NumberField } from '@/components/onboarding/Fields'

function setup(over: Partial<Parameters<typeof NumberField>[0]> = {}) {
  const onChange = vi.fn()
  const props = {
    label: 'Height',
    unit: 'cm',
    min: 120,
    max: 230,
    value: 170 as number | undefined,
    onChange,
    ...over,
  }
  const view = render(<NumberField {...props} />)
  const input = screen.getByLabelText(/height/i) as HTMLInputElement
  return { onChange, input, view, props }
}

describe('clearing a number field', () => {
  it('reports an empty value when every digit is deleted', async () => {
    const user = userEvent.setup()
    const { onChange, input } = setup()

    await user.clear(input)

    // The whole point: emptying the field has to be representable, or the user
    // can never replace a pre-filled value with their own.
    expect(input.value).toBe('')
    expect(onChange).toHaveBeenLastCalledWith(undefined)
  })

  it('lets the first digit be deleted one at a time', async () => {
    const user = userEvent.setup()
    const { onChange, input } = setup({ value: 170 })

    await user.clear(input)
    await user.type(input, '1')
    expect(input.value).toBe('1')

    await user.type(input, '8')
    expect(input.value).toBe('18')
    expect(onChange).toHaveBeenLastCalledWith(18)

    // And back down again, to a single digit, then to nothing.
    await user.keyboard('{Backspace}')
    expect(input.value).toBe('1')
    await user.keyboard('{Backspace}')
    expect(input.value).toBe('')
    expect(onChange).toHaveBeenLastCalledWith(undefined)
  })

  it('accepts a fresh value typed into a cleared field', async () => {
    const user = userEvent.setup()
    const { onChange, input } = setup({ value: 170 })

    await user.clear(input)
    await user.type(input, '185')

    expect(input.value).toBe('185')
    expect(onChange).toHaveBeenLastCalledWith(185)
  })

  it('replaces an existing value without needing to clear it first', async () => {
    const user = userEvent.setup()
    const { onChange, input } = setup({ value: 170 })

    // Select-all then type, which is how people actually change a number.
    await user.clear(input)
    await user.type(input, '62')

    expect(input.value).toBe('62')
    expect(onChange).toHaveBeenLastCalledWith(62)
  })

  it('does not force a minimum while the field is being edited', async () => {
    const user = userEvent.setup()
    const { onChange, input } = setup({ value: 170, min: 120 })

    await user.clear(input)
    // Below the minimum, and mid-way through typing a real one. Neither may be
    // rewritten out from under the caret.
    await user.type(input, '5')
    expect(input.value).toBe('5')
    await user.type(input, '9')
    expect(input.value).toBe('59')
    expect(onChange).toHaveBeenLastCalledWith(59)

    // Out of range but not corrected, not blocked.
    await user.clear(input)
    await user.type(input, '999')
    expect(input.value).toBe('999')
    expect(onChange).toHaveBeenLastCalledWith(999)
  })

  it('keeps a decimal value while typing', async () => {
    const user = userEvent.setup()
    const { onChange, input } = setup({ value: 65, min: 25, max: 300, step: 0.1, unit: 'kg' })

    await user.clear(input)
    await user.type(input, '72.4')

    expect(input.value).toBe('72.4')
    expect(onChange).toHaveBeenLastCalledWith(72.4)
  })

  it('shows an externally set value', () => {
    const { input } = setup({ value: 168 })
    expect(input.value).toBe('168')
  })

  it('starts empty when there is no value', () => {
    const { input } = setup({ value: undefined })
    expect(input.value).toBe('')
  })
})
