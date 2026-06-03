import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Diedrico',
  description: 'Interactive learning tool for dihedral (orthographic) projection',
  base: '/diedrico/',

  ignoreDeadLinks: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/diedrico/logo.svg' }],
  ],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'API Reference', link: '/api/domain-model' },
      { text: 'Contributing', link: '/contributing/development-setup' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Diedrico?', link: '/guide/what-is-diedrico' },
            { text: 'Getting Started', link: '/guide/getting-started' },
          ]
        },
        {
          text: 'Using Diedrico',
          items: [
            { text: 'Workspace Overview', link: '/guide/workspace' },
            { text: 'Construction Tools', link: '/guide/tools' },
            { text: '3D View', link: '/guide/three-view' },
            { text: 'Process Tree', link: '/guide/process-tree' },
            { text: 'Saving & Loading', link: '/guide/persistence' },
          ]
        },
        {
          text: 'Geometry Concepts',
          items: [
            { text: 'Projection Planes', link: '/guide/projection-planes' },
            { text: 'Hinge Lines & Guides', link: '/guide/hinge-lines' },
            { text: '3D Reconstruction', link: '/guide/3d-reconstruction' },
          ]
        },
      ],

      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/architecture/overview' },
            { text: 'Domain Model', link: '/architecture/domain-model' },
            { text: 'Realization Pattern', link: '/architecture/realization' },
            { text: 'Command Pattern', link: '/architecture/commands' },
            { text: 'Rendering Pipeline', link: '/architecture/rendering' },
            { text: 'State Management', link: '/architecture/stores' },
            { text: 'Remediation Plan', link: '/architecture/remediation-plan' },
          ]
        },
      ],

      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Domain Model', link: '/api/domain-model' },
            { text: 'Operations', link: '/api/operations' },
            { text: 'Services', link: '/api/services' },
            { text: 'Utilities', link: '/api/utilities' },
          ]
        },
      ],

      '/contributing/': [
        {
          text: 'Contributing',
          items: [
            { text: 'Development Setup', link: '/contributing/development-setup' },
            { text: 'Testing', link: '/contributing/testing' },
            { text: 'Deployment', link: '/DEPLOYMENT' },
            { text: 'Google Drive Setup', link: '/GOOGLE_DRIVE_SETUP' },
          ]
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/salva/diedrico' },
    ],

    search: {
      provider: 'local',
    },

    footer: {
      message: 'Released under the GPL-3.0 License.',
      copyright: 'Copyright © 2025-2026 Diedrico Contributors',
    },
  },
})
