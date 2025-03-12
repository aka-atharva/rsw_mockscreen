"use client"

import Navbar from "@/components/navbar"
import { SparklesCore } from "@/components/sparkles"
import DataPuurSidebar from "@/components/datapuur-sidebar"
import { Button } from "@/components/ui/button"
import { FileUp, Database, LinkIcon } from "lucide-react"
import { motion } from "framer-motion"

export default function IngestionPage() {
  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <main className="min-h-screen bg-background antialiased relative overflow-hidden">
      {/* Ambient background with moving particles */}
      <div className="h-full w-full absolute inset-0 z-0">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor="var(--foreground)"
        />
      </div>

      <div className="relative z-10">
        <Navbar />

        <div className="flex">
          <DataPuurSidebar />

          <div className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl font-bold text-foreground mb-6"
              >
                Data Ingestion
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-muted-foreground text-xl mb-8"
              >
                Import and collect data from various sources.
              </motion.p>

              <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
                <motion.div
                  variants={item}
                  className="bg-card/80 backdrop-blur-sm p-8 rounded-lg border border-border mb-8 shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                    <FileUp className="w-6 h-6 text-primary mr-2" />
                    Upload Data
                  </h3>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-background/50">
                    <motion.div whileHover={{ scale: 1.05 }} className="inline-block">
                      <FileUp className="w-16 h-16 text-primary mx-auto mb-4" />
                    </motion.div>
                    <p className="text-muted-foreground mb-4">Drag and drop files here, or click to browse</p>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Select Files</Button>
                  </div>
                </motion.div>

                <motion.div
                  variants={item}
                  className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-border shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <h3 className="text-xl font-semibold text-foreground mb-4">Data Sources</h3>
                  <div className="space-y-4">
                    <motion.div
                      whileHover={{ x: 5 }}
                      className="p-4 border border-border rounded-lg flex justify-between items-center bg-gradient-to-r from-primary/5 to-secondary/5"
                    >
                      <div className="flex items-center">
                        <Database className="w-8 h-8 text-primary mr-3" />
                        <div>
                          <h4 className="text-foreground font-medium">Database Connection</h4>
                          <p className="text-muted-foreground text-sm">Connect to SQL, NoSQL, or other databases</p>
                        </div>
                      </div>
                      <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                        Connect
                      </Button>
                    </motion.div>

                    <motion.div
                      whileHover={{ x: 5 }}
                      className="p-4 border border-border rounded-lg flex justify-between items-center bg-gradient-to-r from-secondary/5 to-primary/5"
                    >
                      <div className="flex items-center">
                        <LinkIcon className="w-8 h-8 text-secondary mr-3" />
                        <div>
                          <h4 className="text-foreground font-medium">API Integration</h4>
                          <p className="text-muted-foreground text-sm">Connect to external APIs</p>
                        </div>
                      </div>
                      <Button variant="outline" className="border-secondary text-secondary hover:bg-secondary/10">
                        Configure
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

