// scripts/generate-user-guide-v2.ts
// Generates comprehensive user guide with screenshots and diagrams in DOCX and PDF formats

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ImageRun,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  VerticalAlign,
} from 'docx'
import PDFDocument from 'pdfkit'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const OUTPUT_DIR = path.join(__dirname, '..', 'docs')
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, 'screenshots')
const DIAGRAMS_DIR = path.join(OUTPUT_DIR, 'diagrams')

// Colors
const PRIMARY = '409EFF'
const SUCCESS = '67C23A'
const WARNING = 'E6A23C'
const DANGER = 'F56C6C'
const DARK = '303133'
const GRAY = '606266'
const LIGHT = '909399'

// Check if screenshot exists
function getScreenshot(name: string): Buffer | null {
  const filePath = path.join(SCREENSHOTS_DIR, name)
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath)
  }
  return null
}

// Check if diagram exists
function getDiagram(name: string): Buffer | null {
  const filePath = path.join(DIAGRAMS_DIR, name)
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath)
  }
  return null
}

// ============================================================
// DOCX GENERATION
// ============================================================
async function generateDocx() {
  console.log('📝 Generating DOCX user guide...')

  const children: (Paragraph | typeof ImageRun)[] = []

  // ===== COVER PAGE =====
  children.push(
    new Paragraph({
      spacing: { before: 2000 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '四月红番天',
          bold: true,
          size: 72,
          color: PRIMARY,
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '有机番茄销售管理系统',
          size: 36,
          color: GRAY,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
    })
  )

  children.push(new Paragraph({ text: '' }))

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '用户操作手册',
          bold: true,
          size: 48,
          color: DARK,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `版本 1.2.0  |  ${new Date().toLocaleDateString('zh-CN')}`,
          size: 24,
          color: LIGHT,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
    })
  )

  children.push(new Paragraph({ children: [new PageBreak()] }))

  // ===== TABLE OF CONTENTS =====
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '目录',
          bold: true,
          size: 36,
          color: PRIMARY,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
    })
  )

  const tocItems = [
    '1. 系统简介',
    '2. 登录系统',
    '3. 仪表盘（首页）',
    '4. 客户管理',
    '5. 订单管理',
    '6. 库存管理',
    '7. 配送规划',
    '8. 移动端使用',
    '9. 常见问题',
    '10. 快速参考卡',
  ]

  for (const item of tocItems) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: item,
            size: 24,
            color: DARK,
          }),
        ],
        spacing: { before: 100 },
      })
    )
  }

  children.push(new Paragraph({ children: [new PageBreak()] }))

  // ===== SECTION 1: 系统简介 =====
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '1. 系统简介',
          bold: true,
          size: 36,
          color: PRIMARY,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '欢迎使用"四月红番天"有机番茄销售管理系统！',
          size: 24,
        }),
      ],
      spacing: { before: 200 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '本系统专为有机番茄销售业务设计，帮助您高效管理：',
          size: 24,
        }),
      ],
      spacing: { before: 100 },
    })
  )

  const features = [
    '• 客户信息 - 客户联系方式、地址管理',
    '• 订单处理 - 下单、确认、收款、配送全流程',
    '• 库存追踪 - 入库、出库、库存余额一目了然',
    '• 配送规划 - 智能路线规划，一键导航',
  ]

  for (const feature of features) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: feature,
            size: 24,
          }),
        ],
        spacing: { before: 80 },
      })
    )
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '💡 系统特色',
          bold: true,
          size: 26,
          color: SUCCESS,
        }),
      ],
      spacing: { before: 200 },
    })
  )

  const highlights = [
    '📱 移动端友好：支持手机、平板使用',
    '📴 离线可用：PWA技术支持离线操作',
    '🗺️ 地图集成：高德地图智能导航',
    '💾 数据安全：云端存储，实时同步',
  ]

  for (const h of highlights) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: h,
            size: 24,
          }),
        ],
        spacing: { before: 60 },
      })
    )
  }

  children.push(new Paragraph({ children: [new PageBreak()] }))

  // ===== SECTION 2: 登录系统 =====
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '2. 登录系统',
          bold: true,
          size: 36,
          color: PRIMARY,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '🔐 首次使用需要管理员为您创建账号。',
          size: 24,
        }),
      ],
      spacing: { before: 200 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '登录步骤：',
          bold: true,
          size: 24,
        }),
      ],
      spacing: { before: 150 },
    })
  )

  const loginSteps = [
    '1. 打开系统网址',
    '2. 输入您的邮箱/用户名',
    '3. 输入密码',
    '4. 点击"登录"按钮',
  ]

  for (const step of loginSteps) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: step,
            size: 24,
          }),
        ],
        spacing: { before: 60 },
        indent: { left: 400 },
      })
    )
  }

  // Login screenshot
  const loginScreenshot = getScreenshot('01-login.png')
  if (loginScreenshot) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: loginScreenshot,
            transformation: {
              width: 500,
              height: 300,
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
      })
    )
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '登录界面',
            size: 20,
            color: LIGHT,
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    )
  }

  children.push(new Paragraph({ children: [new PageBreak()] }))

  // ===== SECTION 3: 仪表盘 =====
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '3. 仪表盘（首页）',
          bold: true,
          size: 36,
          color: PRIMARY,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '📊 登录后首先看到的是仪表盘，展示业务概览。',
          size: 24,
        }),
      ],
      spacing: { before: 200 },
    })
  )

  // Dashboard screenshot
  const dashboardScreenshot = getScreenshot('02-dashboard.png')
  if (dashboardScreenshot) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: dashboardScreenshot,
            transformation: {
              width: 550,
              height: 330,
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
      })
    )
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '数据卡片说明：',
          bold: true,
          size: 24,
        }),
      ],
      spacing: { before: 200 },
    })
  )

  const cardDescriptions = [
    '• 今日订单 - 当天创建的订单数量',
    '• 今日收入 - 当天已付款订单金额',
    '• 当前库存 - 库存总数量',
    '• 待配送 - 等待配送的订单数',
    '• 今日入库/出库 - 当天库存变动',
  ]

  for (const desc of cardDescriptions) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: desc,
            size: 24,
          }),
        ],
        spacing: { before: 60 },
      })
    )
  }

  children.push(new Paragraph({ children: [new PageBreak()] }))

  // ===== SECTION 4: 客户管理 =====
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '4. 客户管理',
          bold: true,
          size: 36,
          color: PRIMARY,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '👥 客户管理模块用于维护所有客户信息。',
          size: 24,
        }),
      ],
      spacing: { before: 200 },
    })
  )

  // Customers screenshot
  const customersScreenshot = getScreenshot('03-customers.png')
  if (customersScreenshot) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: customersScreenshot,
            transformation: {
              width: 550,
              height: 330,
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
      })
    )
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '4.1 添加客户',
          bold: true,
          size: 26,
          color: SUCCESS,
        }),
      ],
      spacing: { before: 200 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '➕ 步骤：',
          size: 24,
        }),
      ],
      spacing: { before: 100 },
    })
  )

  const addCustomerSteps = [
    '1. 点击右上角"新增客户"按钮',
    '2. 填写客户信息：',
    '   • 客户名称（必填）',
    '   • 微信号',
    '   • 电话号码',
    '   • 备注信息',
    '3. 添加配送地址',
    '4. 点击"确定"保存',
  ]

  for (const step of addCustomerSteps) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: step,
            size: 24,
          }),
        ],
        spacing: { before: 50 },
        indent: { left: 200 },
      })
    )
  }

  children.push(new Paragraph({ children: [new PageBreak()] }))

  // ===== SECTION 5: 订单管理 =====
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '5. 订单管理',
          bold: true,
          size: 36,
          color: PRIMARY,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '📋 订单管理是系统的核心功能。',
          size: 24,
        }),
      ],
      spacing: { before: 200 },
    })
  )

  // Orders screenshot
  const ordersScreenshot = getScreenshot('05-orders.png')
  if (ordersScreenshot) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: ordersScreenshot,
            transformation: {
              width: 550,
              height: 330,
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
      })
    )
  }

  // Order workflow diagram
  const orderWorkflow = getDiagram('order-workflow.svg')
  if (orderWorkflow) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '订单处理流程',
            bold: true,
            size: 24,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 300 },
      })
    )
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: orderWorkflow,
            transformation: {
              width: 550,
              height: 140,
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 100 },
      })
    )
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '5.1 新建订单',
          bold: true,
          size: 26,
          color: SUCCESS,
        }),
      ],
      spacing: { before: 300 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '创建订单步骤：选择客户 → 输入箱数 → 设置单价 → 添加配送地址',
          size: 24,
        }),
      ],
      spacing: { before: 100 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '💡 一单多地址：一个订单可以配送到多个地点，每个配送点可指定不同收件人。',
          size: 24,
          color: WARNING,
        }),
      ],
      spacing: { before: 150 },
    })
  )

  children.push(new Paragraph({ children: [new PageBreak()] }))

  // ===== SECTION 6: 库存管理 =====
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '6. 库存管理',
          bold: true,
          size: 36,
          color: PRIMARY,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '📦 库存管理追踪所有入库、出库记录。',
          size: 24,
        }),
      ],
      spacing: { before: 200 },
    })
  )

  // Stock flow diagram
  const stockFlow = getDiagram('stock-flow.svg')
  if (stockFlow) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: stockFlow,
            transformation: {
              width: 550,
              height: 125,
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
      })
    )
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '入库操作',
          bold: true,
          size: 26,
          color: SUCCESS,
        }),
      ],
      spacing: { before: 200 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '点击"入库"按钮，填写入库数量、采摘日期等信息后确认。',
          size: 24,
        }),
      ],
      spacing: { before: 100 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '出库操作',
          bold: true,
          size: 26,
          color: DANGER,
        }),
      ],
      spacing: { before: 200 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '确认订单时系统自动出库，无需手动操作。',
          size: 24,
        }),
      ],
      spacing: { before: 100 },
    })
  )

  children.push(new Paragraph({ children: [new PageBreak()] }))

  // ===== SECTION 7: 配送规划 =====
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '7. 配送规划',
          bold: true,
          size: 36,
          color: PRIMARY,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '🚚 配送规划帮助您高效安排配送路线。',
          size: 24,
        }),
      ],
      spacing: { before: 200 },
    })
  )

  // Delivery planning diagram
  const deliveryPlanning = getDiagram('delivery-planning.svg')
  if (deliveryPlanning) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: deliveryPlanning,
            transformation: {
              width: 550,
              height: 150,
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
      })
    )
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '🗺️ 一键导航',
          bold: true,
          size: 26,
          color: SUCCESS,
        }),
      ],
      spacing: { before: 200 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '点击"高德导航"按钮，自动打开高德地图APP，导入所有途经点。',
          size: 24,
        }),
      ],
      spacing: { before: 100 },
    })
  )

  children.push(new Paragraph({ children: [new PageBreak()] }))

  // ===== SECTION 8: 移动端使用 =====
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '8. 移动端使用',
          bold: true,
          size: 36,
          color: PRIMARY,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '📱 本系统完美支持手机浏览器使用！',
          size: 24,
        }),
      ],
      spacing: { before: 200 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '将网页添加到主屏幕：',
          bold: true,
          size: 24,
        }),
      ],
      spacing: { before: 150 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'iPhone (Safari)：',
          bold: true,
          size: 24,
        }),
      ],
      spacing: { before: 100 },
    })
  )
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '点击分享按钮 → 选择"添加到主屏幕" → 命名并添加',
          size: 24,
        }),
      ],
      indent: { left: 200 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Android (Chrome)：',
          bold: true,
          size: 24,
        }),
      ],
      spacing: { before: 100 },
    })
  )
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '点击菜单按钮 → 选择"添加到主屏幕" → 确认添加',
          size: 24,
        }),
      ],
      indent: { left: 200 },
    })
  )

  children.push(new Paragraph({ children: [new PageBreak()] }))

  // ===== SECTION 9: 常见问题 =====
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '9. 常见问题',
          bold: true,
          size: 36,
          color: PRIMARY,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
    })
  )

  const faqs = [
    {
      q: 'Q1: 忘记密码怎么办？',
      a: '请联系管理员重置密码。',
    },
    {
      q: 'Q2: 订单确认后发现错误怎么办？',
      a: '点击"取消"按钮，订单会回到待确认状态，库存会自动回补。',
    },
    {
      q: 'Q3: 客户有多个地址怎么处理？',
      a: '在客户信息中添加多个地址，创建订单时可以选择或分配到不同地址。',
    },
    {
      q: 'Q4: 配送时某个地点导航不到？',
      a: '检查地址是否有坐标标记（绿色图标），如果没有，编辑配送地址重新获取坐标。',
    },
    {
      q: 'Q5: 可以多人同时使用吗？',
      a: '可以！系统支持多人同时操作，数据实时同步。',
    },
  ]

  for (const faq of faqs) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: faq.q,
            bold: true,
            size: 24,
          }),
        ],
        spacing: { before: 200 },
      })
    )
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: faq.a,
            size: 24,
            color: GRAY,
          }),
        ],
        indent: { left: 200 },
      })
    )
  }

  children.push(new Paragraph({ children: [new PageBreak()] }))

  // ===== SECTION 10: QUICK REFERENCE =====
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '10. 快速参考卡',
          bold: true,
          size: 36,
          color: PRIMARY,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '可打印此页作为日常操作参考',
          size: 22,
          color: LIGHT,
          italics: true,
        }),
      ],
      spacing: { before: 100 },
    })
  )

  const quickRefs = [
    { icon: '👥', title: '客户管理', items: ['新增客户 → 填写信息 → 添加地址', '搜索：按姓名/电话/微信'] },
    { icon: '📋', title: '订单管理', items: ['新建 → 选择客户 → 输入数量 → 分配地址', '确认：自动扣库存', '收款：选择付款方式'] },
    { icon: '📦', title: '库存管理', items: ['入库：手动添加', '出库：订单确认自动', '调整：盘点差异'] },
    { icon: '🚚', title: '配送规划', items: ['设置出发地 → 选择订单 → 创建任务', '导航：一键高德地图'] },
  ]

  for (const ref of quickRefs) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${ref.icon} ${ref.title}`,
            bold: true,
            size: 26,
            color: SUCCESS,
          }),
        ],
        spacing: { before: 250 },
      })
    )
    for (const item of ref.items) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${item}`,
              size: 24,
            }),
          ],
          indent: { left: 300 },
        })
      )
    }
  }

  // Final page
  children.push(new Paragraph({ children: [new PageBreak()] }))
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '🎉',
          size: 72,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 2000 },
    })
  )
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '感谢使用"四月红番天"系统！',
          bold: true,
          size: 32,
          color: SUCCESS,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
    })
  )
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '如有问题请联系技术支持',
          size: 24,
          color: GRAY,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
    })
  )

  // Build document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: '四月红番天 - 用户操作手册',
                    size: 18,
                    color: LIGHT,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: LIGHT,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const outputPath = path.join(OUTPUT_DIR, '用户操作手册.docx')
  await fs.promises.writeFile(outputPath, buffer)
  console.log(`✅ DOCX generated: ${outputPath}`)
  return outputPath
}

// ============================================================
// PDF GENERATION
// ============================================================
async function generatePdf() {
  return new Promise((resolve, reject) => {
    console.log('📝 Generating PDF user guide...')
    const outputPath = path.join(OUTPUT_DIR, '用户操作手册.pdf')

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
      info: {
        Title: '四月红番天 - 用户操作手册',
        Author: '四月红番天',
        Subject: '有机番茄销售管理系统用户手册',
      },
    })

    const stream = fs.createWriteStream(outputPath)
    doc.pipe(stream)

    // Cover Page
    doc.fontSize(36).fillColor('#' + PRIMARY).text('四月红番天', { align: 'center' })
    doc.moveDown()
    doc.fontSize(18).fillColor('#666666').text('有机番茄销售管理系统', { align: 'center' })
    doc.moveDown(2)
    doc.fontSize(24).fillColor('#' + DARK).text('用户操作手册', { align: 'center' })
    doc.moveDown(3)
    doc.fontSize(12).fillColor('#999999').text(`版本: 1.2.0`, { align: 'center' })
    doc.text(`更新日期: ${new Date().toLocaleDateString('zh-CN')}`, { align: 'center' })

    // TOC
    doc.addPage()
    doc.fontSize(20).fillColor('#' + PRIMARY).text('目录', { underline: true })
    doc.moveDown()

    const tocItems = [
      '1. 系统简介',
      '2. 登录系统',
      '3. 仪表盘（首页）',
      '4. 客户管理',
      '5. 订单管理',
      '6. 库存管理',
      '7. 配送规划',
      '8. 移动端使用',
      '9. 常见问题',
      '10. 快速参考卡',
    ]

    tocItems.forEach((item) => {
      doc.fontSize(12).fillColor('#' + DARK).text(item)
    })

    // Section 1: Introduction
    doc.addPage()
    doc.fontSize(18).fillColor('#' + PRIMARY).text('1. 系统简介', { underline: true })
    doc.moveDown()
    doc.fontSize(11).fillColor('#' + DARK).text('欢迎使用"四月红番天"有机番茄销售管理系统！')
    doc.moveDown()
    doc.text('本系统专为有机番茄销售业务设计，帮助您高效管理：')
    doc.moveDown()
    ;[
      '• 客户信息 - 客户联系方式、地址管理',
      '• 订单处理 - 下单、确认、收款、配送全流程',
      '• 库存追踪 - 入库、出库、库存余额一目了然',
      '• 配送规划 - 智能路线规划，一键导航',
    ].forEach((item) => doc.text(item))

    doc.moveDown()
    doc.fontSize(13).fillColor('#' + SUCCESS).text('💡 系统特色')
    doc.moveDown()
    ;[
      '📱 移动端友好：支持手机、平板使用',
      '📴 离线可用：PWA技术支持离线操作',
      '🗺️ 地图集成：高德地图智能导航',
      '💾 数据安全：云端存储，实时同步',
    ].forEach((item) => doc.fontSize(11).fillColor('#' + DARK).text(item))

    // Add screenshots if available
    doc.addPage()
    doc.fontSize(18).fillColor('#' + PRIMARY).text('2. 登录系统')
    doc.moveDown()
    doc.fontSize(11).fillColor('#' + DARK).text('🔐 首次使用需要管理员为您创建账号。')
    doc.moveDown()
    doc.text('登录步骤：')
    doc.moveDown()
    ;['1. 打开系统网址', '2. 输入您的邮箱/用户名', '3. 输入密码', '4. 点击"登录"按钮'].forEach((step) =>
      doc.text('   ' + step)
    )

    const loginScreenshot = getScreenshot('01-login.png')
    if (loginScreenshot) {
      doc.moveDown()
      doc.image(loginScreenshot, { width: 450, align: 'center' })
      doc.fontSize(10).fillColor('#999999').text('登录界面', { align: 'center' })
    }

    // Continue with other sections...
    doc.addPage()
    doc.fontSize(18).fillColor('#' + PRIMARY).text('3. 仪表盘（首页）')
    doc.moveDown()
    doc.fontSize(11).fillColor('#' + DARK).text('📊 登录后首先看到的是仪表盘，展示业务概览。')

    const dashboardScreenshot = getScreenshot('02-dashboard.png')
    if (dashboardScreenshot) {
      doc.moveDown()
      doc.image(dashboardScreenshot, { width: 480, align: 'center' })
    }

    // Quick Reference (last page)
    doc.addPage()
    doc.fontSize(18).fillColor('#' + PRIMARY).text('10. 快速参考卡')
    doc.moveDown()
    doc.fontSize(10).fillColor('#999999').text('可打印此页作为日常操作参考')
    doc.moveDown()

    const quickRefs = [
      { icon: '👥', title: '客户管理', items: ['新增客户 → 填写信息 → 添加地址', '搜索：按姓名/电话/微信'] },
      { icon: '📋', title: '订单管理', items: ['新建 → 选择客户 → 输入数量 → 分配地址', '确认：自动扣库存', '收款：选择付款方式'] },
      { icon: '📦', title: '库存管理', items: ['入库：手动添加', '出库：订单确认自动', '调整：盘点差异'] },
      { icon: '🚚', title: '配送规划', items: ['设置出发地 → 选择订单 → 创建任务', '导航：一键高德地图'] },
    ]

    for (const ref of quickRefs) {
      doc.fontSize(13).fillColor('#' + SUCCESS).text(`${ref.icon} ${ref.title}`)
      for (const item of ref.items) {
        doc.fontSize(11).fillColor('#' + DARK).text(`   • ${item}`)
      }
      doc.moveDown()
    }

    // Final page
    doc.addPage()
    doc.fontSize(14).fillColor('#' + SUCCESS).text('🎉 感谢使用"四月红番天"系统！', { align: 'center' })
    doc.moveDown()
    doc.fontSize(10).fillColor('#666666').text('如有问题请联系技术支持', { align: 'center' })

    doc.end()

    stream.on('finish', () => {
      console.log(`✅ PDF generated: ${outputPath}`)
      resolve(outputPath)
    })

    stream.on('error', reject)
  })
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('📚 User Guide Generation\n')
  console.log('='.repeat(50))

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  try {
    await generateDocx()
  } catch (error) {
    console.error('❌ DOCX generation failed:', error)
  }

  try {
    await generatePdf()
  } catch (error) {
    console.error('❌ PDF generation failed:', error)
  }

  console.log('\n' + '='.repeat(50))
  console.log('✨ User Guide generation complete!')
  console.log(`📁 Output directory: ${OUTPUT_DIR}`)
}

main().catch(console.error)
