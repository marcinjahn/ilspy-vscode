﻿using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using ICSharpCode.Decompiler;
using Microsoft.Extensions.Logging;
using Mono.Cecil;
using MsilDecompiler.MsilSpy;
using OmniSharp.Host.Services;

namespace MsilDecompiler.Host.Providers
{
    public class DecompilationProvider : IDecompilationProvider
    {
        private ILogger _logger;
        private Dictionary<AssemblyDefinition, Dictionary<MetadataToken, IMetadataTokenProvider>> _tokenToProviderMap;
        private Dictionary<string, AssemblyDefinition> _assemblyDefinitions = new Dictionary<string, AssemblyDefinition>();
        private IMsilDecompilerEnvironment _decompilationConfiguration;

        //TODO: change to a list of supported languages
        private Language _language;

        public bool IsDotNetAssembly { get; private set; }

        public DecompilationProvider(IMsilDecompilerEnvironment decompilationConfiguration, ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger<DecompilationProvider>();
            _decompilationConfiguration = decompilationConfiguration;
            _language = new CSharpLanguage();

            Initialize();
        }

        private void Initialize()
        {
            _tokenToProviderMap = new Dictionary<AssemblyDefinition, Dictionary<MetadataToken, IMetadataTokenProvider>>();

            if (!string.IsNullOrEmpty(_decompilationConfiguration.AssemblyPath))
            {
                TryLoadAssembly(_decompilationConfiguration.AssemblyPath);
            }
        }

        public bool AddAssembly(string path)
        {
            return TryLoadAssembly(path);
        }

        private bool TryLoadAssembly(string path)
        {
            try
            {
                var assemblyDefinition = AssemblyDefinition.ReadAssembly(
                    path,
                    new ReaderParameters { AssemblyResolver = new MyDefaultAssemblyResolver() });
                if (assemblyDefinition != null)
                {
                    IsDotNetAssembly = true;
                    _assemblyDefinitions[path] = assemblyDefinition;
                    PopulateTokenToProviderMap(assemblyDefinition);

                    return true;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError("An exception occurred when reading assembly {assembly}: {exception}", path, ex);
            }

            return false;
        }

        private void PopulateTokenToProviderMap(AssemblyDefinition assemblyDefinition)
        {
            AddToProviderMap(assemblyDefinition, assemblyDefinition);
            foreach (var moduleDefinition in assemblyDefinition.Modules)
            {
                foreach (var typeDefinition in moduleDefinition.Types)
                {
                    PopulateTokenToProviderMap(assemblyDefinition, typeDefinition);
                }
            }
        }

        private void AddToProviderMap(AssemblyDefinition assembly, IMetadataTokenProvider provider)
        {
            if (!_tokenToProviderMap.ContainsKey(assembly))
            {
                _tokenToProviderMap.Add(assembly, new Dictionary<MetadataToken, IMetadataTokenProvider>());
            }

            _tokenToProviderMap[assembly][provider.MetadataToken] = provider;
        }

        private void PopulateTokenToProviderMap(AssemblyDefinition assembly, TypeDefinition typeDefinition)
        {
            if (typeDefinition == null)
            {
                return;
            }

            AddToProviderMap(assembly, typeDefinition);

            foreach (var methodDefinition in typeDefinition.Methods)
            {
                AddToProviderMap(assembly, methodDefinition);
            }

            foreach (var eventDefinition in typeDefinition.Events)
            {
                AddToProviderMap(assembly, eventDefinition);
            }

            foreach (var fieldDefinition in typeDefinition.Fields)
            {
                AddToProviderMap(assembly, fieldDefinition);
            }

            foreach (var propertyDefinition in typeDefinition.Properties)
            {
                AddToProviderMap(assembly, propertyDefinition);
            }

            foreach (var nestedType in typeDefinition.NestedTypes)
            {
                PopulateTokenToProviderMap(assembly, nestedType);
            }
        }

        private IEnumerable<ModuleDefinition> GetModules(AssemblyDefinition assembly)
        {
            foreach (var moduleDefinition in ((AssemblyDefinition)_tokenToProviderMap[assembly][assembly.MetadataToken]).Modules)
            {
                yield return moduleDefinition;
            }
        }

        private IEnumerable<TypeDefinition> GetTypes(AssemblyDefinition assembly)
        {
            foreach (var moduleDefinition in GetModules(assembly))
            {
                foreach (var typeDefinition in moduleDefinition.Types)
                {

                    yield return typeDefinition;
                }
            }
        }

        private string GetCSharpCode<T>(T t)
        {
            using (StringWriter writer = new StringWriter())
            {
                var output = new PlainTextOutput(writer);
                var settings = _decompilationConfiguration.DecompilerSettings;
                if (t is AssemblyDefinition)
                {
                    _language.DecompileAssembly(t as AssemblyDefinition, output, settings);
                }
                else if (t is TypeDefinition)
                {
                    _language.DecompileType(t as TypeDefinition, output, settings);
                }
                else if (t is MethodDefinition)
                {
                    _language.DecompileMethod(t as MethodDefinition, output, settings);
                }
                else if (t is FieldDefinition)
                {
                    _language.DecompileField(t as FieldDefinition, output, settings);
                }
                else if (t is EventDefinition)
                {
                    _language.DecompileEvent(t as EventDefinition, output, settings);
                }
                else if (t is PropertyDefinition)
                {
                    _language.DecompileProperty(t as PropertyDefinition, output, settings);
                }

                return writer.ToString();
            }
        }

        public IEnumerable<MemberData> GetTypeTuples(string assemblyPath)
        {
            return GetTypeTuples(_assemblyDefinitions[assemblyPath]);
        }

        private IEnumerable<MemberData> GetTypeTuples(AssemblyDefinition assembly)
        {
            return GetTypes(assembly).Select(t => new MemberData()
            {
                Name = t.Name,
                Token = t.MetadataToken,
                TypeSubKind = GetTypeSubKind(t)
            });
        }

        private TypeDefSubKind GetTypeSubKind(TypeDefinition t)
        {
            if (t.IsInterface)
            {
                return TypeDefSubKind.Interface;
            }
            else if (t.IsEnum)
            {
                return TypeDefSubKind.Enum;
            }
            else if (t.IsClass && t.IsValueType)
            {
                return TypeDefSubKind.Structure;
            }
            else if (t.IsClass)
            {
                return TypeDefSubKind.Class;
            }

            return TypeDefSubKind.None;
        }

        public string GetCode(string assemblyPath, TokenType type, uint rid)
        {
            return GetCode(_assemblyDefinitions[assemblyPath], type, rid);
        }

        private string GetCode(AssemblyDefinition assembly, TokenType type, uint rid)
        {
            if (rid == 0)
            {
                return GetCSharpCode(assembly);
            }

            var provider = _tokenToProviderMap[assembly][new MetadataToken(type, rid)];
            return GetCSharpCode(provider);
        }

        public string GetMemberCode(string assemblyPath, MetadataToken token)
        {
            return GetMemberCode(_assemblyDefinitions[assemblyPath], token);
        }

        private string GetMemberCode(AssemblyDefinition assembly, MetadataToken token)
        {
            var tokenType = token.TokenType;
            if (tokenType != TokenType.Event &&
                tokenType != TokenType.Field &&
                tokenType != TokenType.Property &&
                tokenType != TokenType.Method &&
                tokenType != TokenType.TypeDef)
            {
                return string.Empty;
            }

            var provider = _tokenToProviderMap[assembly][token];
            return GetCSharpCode(provider);
        }

        public IEnumerable<MemberData> GetChildren(string assemblyPath, TokenType tokenType, uint rid)
        {
            return GetChildren(_assemblyDefinitions[assemblyPath], tokenType, rid);
        }

        private IEnumerable<MemberData> GetChildren(AssemblyDefinition assembly, TokenType type, uint rid)
        {
            if (_tokenToProviderMap[assembly][new MetadataToken(type, rid)] is TypeDefinition typeDefinition)
            {
                foreach (var methodDefinition in typeDefinition.Methods)
                {
                    yield return new MemberData
                    {
                        Name = _language.FormatMethodName(methodDefinition),
                        Token = methodDefinition.MetadataToken,
                        TypeSubKind = TypeDefSubKind.None
                    };
                }

                foreach (var eventDefinition in typeDefinition.Events)
                {
                    yield return new MemberData
                    {
                        Name = _language.FormatEventName(eventDefinition),
                        Token = eventDefinition.MetadataToken,
                        TypeSubKind = TypeDefSubKind.None
                    };
                }

                foreach (var fieldDefinition in typeDefinition.Fields)
                {
                    yield return new MemberData
                    {
                        Name = _language.FormatFieldName(fieldDefinition),
                        Token = fieldDefinition.MetadataToken,
                        TypeSubKind = TypeDefSubKind.None
                    };
                }

                foreach (var propertyDefinition in typeDefinition.Properties)
                {
                    yield return new MemberData
                    {
                        Name = _language.FormatPropertyName(propertyDefinition),
                        Token = propertyDefinition.MetadataToken,
                        TypeSubKind = TypeDefSubKind.None
                    };
                }

                foreach (var nestedType in typeDefinition.NestedTypes)
                {
                    yield return new MemberData
                    {
                        Name = _language.FormatTypeName(nestedType),
                        Token = nestedType.MetadataToken,
                        TypeSubKind = GetTypeSubKind(nestedType)
                    };
                }
            }
        }

        public string GetMethodText(MethodDefinition methodDefinition)
        {
            return _language.FormatMethodName(methodDefinition);
        }

        private IEnumerable<TypeDefinition> GetNestedTypes(TypeDefinition typeDefinition)
        {
            if (typeDefinition != null && typeDefinition.HasNestedTypes)
            {
                foreach (var type in typeDefinition.NestedTypes)
                {
                    yield return type;
                }
            }
        }

        private class MyDefaultAssemblyResolver : DefaultAssemblyResolver
        {
            public override AssemblyDefinition Resolve(AssemblyNameReference name)
            {
                try
                {
                    return base.Resolve(name);
                }
                catch { }
                return null;
            }

            public override AssemblyDefinition Resolve(AssemblyNameReference name, ReaderParameters parameters)
            {
                try
                {
                    return base.Resolve(name, parameters);
                }
                catch { }
                return null;
            }

            public override AssemblyDefinition Resolve(string fullName)
            {
                try
                {
                    return base.Resolve(fullName);
                }
                catch { }
                return null;
            }

            public override AssemblyDefinition Resolve(string fullName, ReaderParameters parameters)
            {
                try
                {
                    return base.Resolve(fullName, parameters);
                }
                catch { }
                return null;
            }
        }

    }
}
