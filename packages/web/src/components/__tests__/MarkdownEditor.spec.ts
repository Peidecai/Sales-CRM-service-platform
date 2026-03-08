import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MarkdownEditor from '../MarkdownEditor.vue'

function mountEditor(modelValue = '') {
  return mount(MarkdownEditor, {
    props: { modelValue },
  })
}

describe('MarkdownEditor', () => {
  it('renders toolbar and textarea', () => {
    const wrapper = mountEditor('')

    expect(wrapper.find('.md-toolbar').exists()).toBe(true)
    expect(wrapper.find('.md-textarea').exists()).toBe(true)
  })

  it('emits update:modelValue when input changes', async () => {
    const wrapper = mountEditor('')
    const textarea = wrapper.find('.md-textarea')

    await textarea.setValue('# Hello')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['# Hello'])
  })

  it('renders markdown html in preview pane', () => {
    const wrapper = mountEditor('**bold**')

    expect(wrapper.find('.md-preview').exists()).toBe(true)
    expect(wrapper.find('.md-preview').html()).toContain('<strong>bold</strong>')
  })

  it('does not render raw script tag in preview', () => {
    const wrapper = mountEditor('<script>alert(1)</script>')

    expect(wrapper.find('.md-preview').html()).not.toContain('<script>')
  })

  it('clicking bold toolbar emits update', async () => {
    const wrapper = mountEditor('')
    const textarea = wrapper.find('.md-textarea').element as HTMLTextAreaElement
    textarea.setSelectionRange(0, 0)

    const boldButton = wrapper.find('[title="粗体 (Ctrl+B)"]')
    await boldButton.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('supports Ctrl+B shortcut', async () => {
    const wrapper = mountEditor('hello')
    const textarea = wrapper.find('.md-textarea')
    const el = textarea.element as HTMLTextAreaElement
    el.setSelectionRange(0, 5)

    await textarea.trigger('keydown', { key: 'b', ctrlKey: true })

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]?.[0]).toContain('**hello**')
  })
})
