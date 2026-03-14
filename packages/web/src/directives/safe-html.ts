import DOMPurify from 'dompurify'
import type { Directive } from 'vue'

export const vSafeHtml: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    el.innerHTML = DOMPurify.sanitize(binding.value ?? '')
  },
  updated(el, binding) {
    el.innerHTML = DOMPurify.sanitize(binding.value ?? '')
  },
}
