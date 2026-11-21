plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "org.bricohams.stationagent"
    compileSdk = 35
    defaultConfig {
        applicationId = "org.bricohams.stationagent"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }
    buildFeatures { buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    testOptions { unitTests.isIncludeAndroidResources = true }
    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }
}
dependencies {
    implementation(project(":station-core"))
    implementation("com.github.mik3y:usb-serial-for-android:3.9.0")
    implementation("org.java-websocket:Java-WebSocket:1.6.0")
    runtimeOnly("org.slf4j:slf4j-nop:2.0.6")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.14.1")
}
