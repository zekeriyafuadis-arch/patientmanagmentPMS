@echo off

cd /d "C:\Users\Suleman Abay\Desktop\HMS\seyadoc\saydochtm\patient-management-system\serverless-back-db>"

start cmd /k "npm start"

timeout /t 10

start http://localhost:3000

