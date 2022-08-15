import Vue from 'vue'
import Vuex from 'vuex'
import config from '../assets/scripts/config'
import WxRenderer from '../assets/scripts/renderers/wx-renderer'
import { marked } from 'marked'
import CodeMirror from 'codemirror/lib/codemirror'
import DEFAULT_CONTENT from '@/assets/example/markdown.md'
import DEFAULT_CSS_CONTENT from '@/assets/example/theme-css.txt'
import { setColor, formatDoc, formatCss } from '@/assets/scripts/util'

Vue.use(Vuex)

const state = {
  wxRenderer: null,
  output: ``,
  html: ``,
  editor: null,
  cssEditor: null,
  currentFont: ``,
  currentSize: ``,
  currentColor: ``,
  citeStatus: false,
  nightMode: false,
  codeTheme: config.codeThemeOption[0].value,
}
const mutations = {
  setEditorValue(state, data) {
    state.editor.setValue(data)
  },
  setCssEditorValue(state, data) {
    state.cssEditor.setValue(data)
  },
  setWxRendererOptions(state, data) {
    state.wxRenderer.setOptions(data)
  },
  setCiteStatus(state, data) {
    state.citeStatus = data
    localStorage.setItem(`citeStatus`, data)
  },
  setCurrentFont(state, data) {
    state.currentFont = data
    localStorage.setItem(`fonts`, data)
  },
  setCurrentSize(state, data) {
    state.currentSize = data
    localStorage.setItem(`size`, data)
  },
  setCurrentColor(state, data) {
    state.currentColor = data
    localStorage.setItem(`color`, data)
  },
  setCurrentCodeTheme(state, data) {
    state.codeTheme = data
    localStorage.setItem(`codeTheme`, data)
  },
  themeChanged(state) {
    state.nightMode = !state.nightMode
    localStorage.setItem(`nightMode`, state.nightMode)
  },
  initEditorState(state) {
    state.currentFont =
      localStorage.getItem(`fonts`) || config.builtinFonts[0].value
    state.currentColor =
      localStorage.getItem(`color`) || config.colorOption[0].value
    state.currentSize =
      localStorage.getItem(`size`) || config.sizeOption[2].value
    state.codeTheme =
      localStorage.getItem(`codeTheme`) || config.codeThemeOption[0].value
    state.citeStatus = localStorage.getItem(`citeStatus`) === `true`
    state.nightMode = localStorage.getItem(`nightMode`) === `true`
    state.wxRenderer = new WxRenderer({
      theme: setColor(state.currentColor),
      fonts: state.currentFont,
      size: state.currentSize,
    })
  },
  initEditorEntity(state) {
    const editorDom = document.getElementById(`editor`)

    if (!editorDom.value) {
      editorDom.value =
        localStorage.getItem(`__editor_content`) || formatDoc(DEFAULT_CONTENT)
    }
    state.editor = CodeMirror.fromTextArea(editorDom, {
      mode: `text/x-markdown`,
      theme: `xq-light`,
      lineNumbers: false,
      lineWrapping: true,
      styleActiveLine: true,
      autoCloseBrackets: true,
      extraKeys: {
        'Ctrl-F': function autoFormat(editor) {
          const doc = formatDoc(editor.getValue(0))
          localStorage.setItem(`__editor_content`, doc)
          editor.setValue(doc)
        },
        'Ctrl-S': function save(editor) {},
        'Ctrl-B': function bold(editor) {
          const selected = editor.getSelection()
          editor.replaceSelection(`**${selected}**`)
        },
        'Ctrl-D': function del(editor) {
          const selected = editor.getSelection()
          editor.replaceSelection(`~~${selected}~~`)
        },
        'Ctrl-I': function italic(editor) {
          const selected = editor.getSelection()
          editor.replaceSelection(`*${selected}*`)
        },
      },
    })
  },
  initCssEditorEntity(state) {
    const cssEditorDom = document.getElementById(`cssEditor`)

    if (!cssEditorDom.value) {
      cssEditorDom.value =
        localStorage.getItem(`__css_content`) || DEFAULT_CSS_CONTENT
    }
    state.cssEditor = CodeMirror.fromTextArea(cssEditorDom, {
      mode: `css`,
      theme: `style-mirror`,
      lineNumbers: false,
      lineWrapping: true,
      matchBrackets: true,
      autofocus: true,
      extraKeys: {
        'Ctrl-F': function autoFormat(editor) {
          const doc = formatCss(editor.getValue(0))
          localStorage.setItem(`__css_content`, doc)
          editor.setValue(doc)
        },
        'Ctrl-S': function save(editor) {},
      },
    })
  },
  editorRefresh(state) {
    const renderer = state.wxRenderer.getRenderer(state.citeStatus)
    marked.setOptions({ renderer })
    let output = marked.parse(state.editor.getValue(0))

    // 去除第一行的 margin-top
    output = output.replace(/(style=".*?)"/, `$1;margin-top: 0"`)
    if (state.citeStatus) {
      // 引用脚注
      output += state.wxRenderer.buildFootnotes()
      // 附加的一些 style
      output += state.wxRenderer.buildAddition()
    }
    // test
    output += `
      <style>
        .hljs.code__pre::before {

          position: initial;
          padding: 0;

          content: '';
          display: block;
          height: 30px;
          width: 100%;
          margin-bottom: -7px;
          border-radius: 5px;
          background: transparent url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgIHg9IjBweCIgeT0iMHB4IiB3aWR0aD0iNDUwcHgiIGhlaWdodD0iMTMwcHgiPgogIDxlbGxpcHNlIGN4PSI2NSIgY3k9IjY1IiByeD0iNTAiIHJ5PSI1MiIgc3Ryb2tlPSJyZ2IoMjIwLDYwLDU0KSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJyZ2IoMjM3LDEwOCw5NikiLz4KICA8ZWxsaXBzZSBjeD0iMjI1IiBjeT0iNjUiIHJ4PSI1MCIgcnk9IjUyIiAgc3Ryb2tlPSJyZ2IoMjE4LDE1MSwzMykiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0icmdiKDI0NywxOTMsODEpIi8+CiAgPGVsbGlwc2UgY3g9IjM4NSIgY3k9IjY1IiByeD0iNTAiIHJ5PSI1MiIgIHN0cm9rZT0icmdiKDI3LDE2MSwzNykiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0icmdiKDEwMCwyMDAsODYpIi8+Cjwvc3ZnPg==") no-repeat 0px 5px;
          background-size: 40px;
        }
      </style>
    `
    state.output = output
  },
}

export default new Vuex.Store({
  state,
  mutations,
  actions: {},
})
