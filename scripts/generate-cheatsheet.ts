// scripts/generate-cheatsheet.ts
// Generates a one-page printable cheat sheet / quick reference card

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  AlignmentType,
} from 'docx'
import PDFDocument from 'pdfkit'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUTPUT_DIR = path.join(__dirname, '..', 'docs')

// Colors
const PRIMARY = '409EFF'
const SUCCESS = '67C23A'
const WARNING = 'E6A23C'
const DANGER = 'F56C6C'
const DARK = '303133'

async function generateCheatsheetDocx() {
  console.log('📝 Generating cheat sheet DOCX...')

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width in twips
              height: 16838, // A4 height in twips
            },
          },
        },
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: '🚀 四月红番天 - 快速参考卡',
                bold: true,
                size: 32,
                color: PRIMARY,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),

          // Main content table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Row 1: Customer & Orders
              new TableRow({
                children: [
                  // Customer Management
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F5F7FA', type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '👥 客户管理',
                            bold: true,
                            size: 24,
                            color: SUCCESS,
                          }),
                        ],
                        spacing: { before: 100, after: 100 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '新增 → 填写信息 → 添加地址',
                            size: 20,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '搜索：姓名/电话/微信',
                            size: 20,
                            color: '909399',
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '支持多地址，可设默认',
                            size: 18,
                            color: '909399',
                          }),
                        ],
                      }),
                    ],
                  }),
                  // Order Management
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    shading: { fill: 'FFF7E6', type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '📋 订单管理',
                            bold: true,
                            size: 24,
                            color: WARNING,
                          }),
                        ],
                        spacing: { before: 100, after: 100 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '新建 → 选客户 → 数量 → 地址',
                            size: 20,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '确认 = 自动扣库存',
                            size: 20,
                            color: DANGER,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '一单多地址支持',
                            size: 18,
                            color: '909399',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              // Row 2: Status tags
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '订单状态：',
                            bold: true,
                            size: 20,
                          }),
                          new TextRun({
                            text: '  待确认',
                            size: 20,
                            color: WARNING,
                          }),
                          new TextRun({
                            text: ' → 已确认',
                            size: 20,
                            color: PRIMARY,
                          }),
                          new TextRun({
                            text: ' → 配送中',
                            size: 20,
                            color: SUCCESS,
                          }),
                          new TextRun({
                            text: ' → 已完成',
                            size: 20,
                            color: SUCCESS,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 100, after: 100 },
                      }),
                    ],
                  }),
                ],
              }),

              // Row 3: Stock & Delivery
              new TableRow({
                children: [
                  // Stock
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F0F9FF', type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '📦 库存管理',
                            bold: true,
                            size: 24,
                            color: PRIMARY,
                          }),
                        ],
                        spacing: { before: 100, after: 100 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '入库：手动添加数量',
                            size: 20,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '出库：订单确认自动',
                            size: 20,
                            color: SUCCESS,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '调整：盘点差异修正',
                            size: 18,
                            color: '909399',
                          }),
                        ],
                      }),
                    ],
                  }),
                  // Delivery
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F0FFF4', type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '🚚 配送规划',
                            bold: true,
                            size: 24,
                            color: SUCCESS,
                          }),
                        ],
                        spacing: { before: 100, after: 100 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '设置出发地 → 选订单 → 创建',
                            size: 20,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '一键高德导航',
                            size: 20,
                            color: PRIMARY,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '环形路线可选',
                            size: 18,
                            color: '909399',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Keyboard shortcuts / tips
          new Paragraph({
            children: [
              new TextRun({
                text: '💡 常用技巧',
                bold: true,
                size: 24,
                color: PRIMARY,
              }),
            ],
            spacing: { before: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: '• 手机添加到主屏幕 → 像APP一样使用',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '• 点击表格行 → 查看详情',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '• 批量选择 → 批量删除/修改',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '• 地址绿色图标 = 已获取坐标（可导航）',
                size: 20,
              }),
            ],
          }),

          // Quick actions
          new Paragraph({
            children: [
              new TextRun({
                text: '🔄 快速操作',
                bold: true,
                size: 24,
                color: WARNING,
              }),
            ],
            spacing: { before: 200 },
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    shading: { fill: 'FEF0F0', type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: '💰 收款', bold: true, size: 20 })],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: '微信/现金/转账', size: 18, color: '909399' })],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    shading: { fill: 'FDF6EC', type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: '❌ 取消订单', bold: true, size: 20 })],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: '库存自动回补', size: 18, color: '909399' })],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F4F4F5', type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: '📤 导出', bold: true, size: 20 })],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: 'CSV格式', size: 18, color: '909399' })],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Footer
          new Paragraph({
            children: [
              new TextRun({
                text: '版本 1.2.0  |  如有问题联系技术支持',
                size: 18,
                color: '909399',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 300 },
          }),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const outputPath = path.join(OUTPUT_DIR, '快速参考卡.docx')
  await fs.promises.writeFile(outputPath, buffer)
  console.log(`✅ Cheat sheet DOCX: ${outputPath}`)
  return outputPath
}

async function generateCheatsheetPdf() {
  return new Promise((resolve, reject) => {
    console.log('📝 Generating cheat sheet PDF...')
    const outputPath = path.join(OUTPUT_DIR, '快速参考卡.pdf')

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 30, bottom: 30, left: 40, right: 40 },
    })

    const stream = fs.createWriteStream(outputPath)
    doc.pipe(stream)

    // Title
    doc.fontSize(20).fillColor('#' + PRIMARY).text('🚀 四月红番天 - 快速参考卡', { align: 'center' })
    doc.moveDown(0.5)

    // Customer Management
    doc.rect(40, doc.y, 250, 100).fill('#F5F7FA').stroke('#DCDFE6')
    const y1 = doc.y + 10
    doc.fillColor('#' + SUCCESS).fontSize(14).text('👥 客户管理', 50, y1, { continued: false })
    doc.fillColor('#' + DARK).fontSize(11).text('新增 → 填写信息 → 添加地址', 50, y1 + 25)
    doc.fillColor('#909399').fontSize(10).text('搜索：姓名/电话/微信', 50, y1 + 45)
    doc.fillColor('#909399').fontSize(10).text('支持多地址，可设默认', 50, y1 + 65)

    // Order Management
    doc.rect(310, y1 - 10, 250, 100).fill('#FFF7E6').stroke('#E6A23C')
    doc.fillColor('#' + WARNING).fontSize(14).text('📋 订单管理', 320, y1, { continued: false })
    doc.fillColor('#' + DARK).fontSize(11).text('新建 → 选客户 → 数量 → 地址', 320, y1 + 25)
    doc.fillColor('#' + DANGER).fontSize(11).text('确认 = 自动扣库存', 320, y1 + 45)
    doc.fillColor('#909399').fontSize(10).text('一单多地址支持', 320, y1 + 65)

    doc.y = y1 + 110

    // Status flow
    doc.fillColor('#' + DARK).fontSize(12).text('订单状态：', { continued: true })
    doc.fillColor('#' + WARNING).text('待确认', { continued: true })
    doc.fillColor('#' + DARK).text(' → ', { continued: true })
    doc.fillColor('#' + PRIMARY).text('已确认', { continued: true })
    doc.fillColor('#' + DARK).text(' → ', { continued: true })
    doc.fillColor('#' + SUCCESS).text('配送中', { continued: true })
    doc.fillColor('#' + DARK).text(' → ', { continued: true })
    doc.fillColor('#' + SUCCESS).text('已完成', { align: 'center' })

    doc.moveDown(0.5)

    // Stock Management
    const y2 = doc.y
    doc.rect(40, y2, 250, 100).fill('#F0F9FF').stroke('#' + PRIMARY)
    doc.fillColor('#' + PRIMARY).fontSize(14).text('📦 库存管理', 50, y2 + 10, { continued: false })
    doc.fillColor('#' + DARK).fontSize(11).text('入库：手动添加数量', 50, y2 + 35)
    doc.fillColor('#' + SUCCESS).fontSize(11).text('出库：订单确认自动', 50, y2 + 55)
    doc.fillColor('#909399').fontSize(10).text('调整：盘点差异修正', 50, y2 + 75)

    // Delivery Planning
    doc.rect(310, y2, 250, 100).fill('#F0FFF4').stroke('#' + SUCCESS)
    doc.fillColor('#' + SUCCESS).fontSize(14).text('🚚 配送规划', 320, y2 + 10, { continued: false })
    doc.fillColor('#' + DARK).fontSize(11).text('设置出发地 → 选订单 → 创建', 320, y2 + 35)
    doc.fillColor('#' + PRIMARY).fontSize(11).text('一键高德导航', 320, y2 + 55)
    doc.fillColor('#909399').fontSize(10).text('环形路线可选', 320, y2 + 75)

    doc.y = y2 + 120

    // Tips
    doc.fillColor('#' + PRIMARY).fontSize(14).text('💡 常用技巧')
    doc.fillColor('#' + DARK).fontSize(11)
    ;[
      '• 手机添加到主屏幕 → 像APP一样使用',
      '• 点击表格行 → 查看详情',
      '• 批量选择 → 批量删除/修改',
      '• 地址绿色图标 = 已获取坐标（可导航）',
    ].forEach((tip) => doc.text(tip))

    doc.moveDown(0.3)

    // Quick actions
    doc.fillColor('#' + WARNING).fontSize(14).text('🔄 快速操作')
    doc.fillColor('#' + DARK).fontSize(11).text('💰 收款: 微信/现金/转账  |  ❌ 取消订单: 库存自动回补  |  📤 导出: CSV格式')

    // Footer
    doc.moveDown(0.5)
    doc.fillColor('#909399').fontSize(10).text('版本 1.2.0  |  如有问题联系技术支持', { align: 'center' })

    doc.end()

    stream.on('finish', () => {
      console.log(`✅ Cheat sheet PDF: ${outputPath}`)
      resolve(outputPath)
    })

    stream.on('error', reject)
  })
}

async function main() {
  console.log('📄 Cheat Sheet Generation\n')

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  try {
    await generateCheatsheetDocx()
  } catch (error) {
    console.error('❌ DOCX failed:', error)
  }

  try {
    await generateCheatsheetPdf()
  } catch (error) {
    console.error('❌ PDF failed:', error)
  }

  console.log('\n✨ Cheat sheet generation complete!')
}

main().catch(console.error)
