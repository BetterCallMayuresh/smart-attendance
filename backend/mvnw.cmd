@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.
@REM Maven Wrapper launch script for Windows

@echo off
setlocal

set MAVEN_WRAPPER_JAR="%~dp0.mvn\wrapper\maven-wrapper.jar"
set WRAPPER_URL="https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.2/maven-wrapper-3.3.2.jar"
set WRAPPER_PROPERTIES="%~dp0.mvn\wrapper\maven-wrapper.properties"

if not exist "%~dp0.mvn\wrapper" mkdir "%~dp0.mvn\wrapper"

if not exist %MAVEN_WRAPPER_JAR% (
    echo Downloading Maven Wrapper...
    powershell -Command "Invoke-WebRequest -Uri %WRAPPER_URL% -OutFile %MAVEN_WRAPPER_JAR%"
)

set MAVEN_CMD_LINE_ARGS=%*
"%JAVA_HOME%\bin\java.exe" -jar %MAVEN_WRAPPER_JAR% %MAVEN_CMD_LINE_ARGS%
if not "%JAVA_HOME%" == "" goto javaHomeSet
java -jar %MAVEN_WRAPPER_JAR% %MAVEN_CMD_LINE_ARGS%
goto end

:javaHomeSet
"%JAVA_HOME%\bin\java.exe" -jar %MAVEN_WRAPPER_JAR% %MAVEN_CMD_LINE_ARGS%

:end
endlocal
