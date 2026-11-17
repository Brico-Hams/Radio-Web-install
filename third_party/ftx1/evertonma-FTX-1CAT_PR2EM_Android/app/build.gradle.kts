plugins {
    id("com.android.application")
}

android {
    namespace = "com.pr2em.ftx1cat"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.pr2em.ftx1cat"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1a"
    }
}

dependencies {
    implementation("com.github.mik3y:usb-serial-for-android:3.12.0")
}
