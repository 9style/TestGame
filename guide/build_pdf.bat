@echo off
chcp 65001 >nul
echo 正在生成攻略Markdown...
cd /d "%~dp0"
python generate_guide.py
if errorlevel 1 (
    echo 生成Markdown失败！
    pause
    exit /b 1
)
echo 正在转换PDF...
pandoc guide.md -o guide.pdf ^
    --pdf-engine=xelatex ^
    -V mainfont="SimSun" ^
    -V CJKmainfont="SimSun" ^
    -V geometry:margin=2cm ^
    --toc ^
    --toc-depth=2
if errorlevel 1 (
    echo PDF转换失败！请确认已安装 Pandoc 和 MiKTeX。
    pause
    exit /b 1
)
echo 完成！攻略已保存为 guide.pdf
pause
