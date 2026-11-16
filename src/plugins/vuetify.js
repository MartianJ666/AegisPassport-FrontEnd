import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

const lightTheme = {
  dark: false,
  colors: {
    background: '#FDF8FF', surface: '#FFF7FF', 'surface-bright': '#FFF7FF',
    'surface-variant': '#E8DEF8', 'on-surface': '#1D1B20', 'on-surface-variant': '#49454F',
    primary: '#65558F', 'primary-darken-1': '#4F378B', 'primary-container': '#EADDFF',
    'on-primary-container': '#21005D', secondary: '#625B71', 'secondary-container': '#E8DEF8',
    tertiary: '#7D5260', 'tertiary-container': '#FFD8E4', outline: '#79747E',
    error: '#B3261E', info: '#4F64A5', success: '#386A20', warning: '#825500',
  },
}

const darkTheme = {
  dark: true,
  colors: {
    background: '#141218', surface: '#141218', 'surface-bright': '#3B383E',
    'surface-variant': '#49454F', 'on-surface': '#E6E0E9', 'on-surface-variant': '#CAC4D0',
    primary: '#D0BCFF', 'primary-darken-1': '#B69DF8', 'primary-container': '#4F378B',
    'on-primary-container': '#EADDFF', secondary: '#CCC2DC', 'secondary-container': '#4A4458',
    tertiary: '#EFB8C8', 'tertiary-container': '#633B48', outline: '#938F99',
    error: '#F2B8B5', info: '#B8C4FF', success: '#A8D18D', warning: '#F4BE48',
  },
}

export default createVuetify({
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
  theme: {
    defaultTheme: localStorage.getItem('theme') || 'light',
    themes: { light: lightTheme, dark: darkTheme },
  },
  defaults: {
    VCard: { rounded: 'xl' },
    VBtn: { rounded: 'xl', style: 'text-transform: none; letter-spacing: 0.01em;' },
    VTextField: { variant: 'outlined', density: 'comfortable', rounded: 'lg' },
    VSelect: { variant: 'outlined', density: 'comfortable', rounded: 'lg' },
    VTextarea: { variant: 'outlined', density: 'comfortable', rounded: 'lg' },
    VAutocomplete: { variant: 'outlined', density: 'comfortable', rounded: 'lg' },
    VChip: { rounded: 'lg' },
    VSheet: { rounded: 'xl' },
  },
})
